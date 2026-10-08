// api/routes/paddleWebhook.js
//
// Keeps your DB in sync with Paddle — the Paddle twin of stripeWebhook.js.
// Like Stripe, signature verification needs the RAW request body, so this
// route must be registered BEFORE app.use(express.json()):
//
//     import { paddleWebhookHandler } from "./routes/paddleWebhook.js";
//     app.post(
//       "/api/paddle/webhook",
//       express.raw({ type: "application/json" }),
//       paddleWebhookHandler
//     );
//     // ...and ONLY AFTER that line:
//     app.use(express.json());
//
// In the Paddle dashboard → Developer tools → Notifications, create a
// destination pointing at https://your-api/api/paddle/webhook and subscribe
// to: subscription.created, subscription.activated, subscription.updated,
// subscription.past_due, subscription.canceled. Copy its secret → .env as
// PADDLE_WEBHOOK_SECRET. Sandbox and live each have their own destination
// and their own secret.

import { Paddle, Environment, EventName } from "@paddle/paddle-node-sdk";
import Companies from "../models/Companies.js";                  // 👈 adjust
import { planFromPaddlePriceId } from "../config/plans.js";      // 👈 adjust

const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment:
    process.env.PADDLE_ENV === "production"
      ? Environment.production
      : Environment.sandbox,
});

// Paddle subscription status → the values your app already uses.
// Your requireActiveSubscription passes on "active" (or in-trial), blocks the
// rest, and shows a "past_due" banner — so map onto those.
const mapStatus = (s) => {
  switch (s) {
    case "active":
    case "trialing": return "active";     // Paddle trial (you don't use it) still = access
    case "past_due": return "past_due";
    case "paused":   return "paused";     // blocked by the gate (not "active")
    case "canceled": return "canceled";
    default:         return s;
  }
};

// Apply a Paddle subscription object onto the company document.
// companyId comes from the customData we pass at checkout (see Billing.jsx).
// Fallback: match by paddleCustomerId — seeded on the first event, so later
// renewal events still find the company even if customData is absent.
const applySubscription = async (sub) => {
  const companyId = sub.customData?.companyId;
  const priceId   = sub.items?.[0]?.price?.id;
  const mapped    = priceId ? planFromPaddlePriceId(priceId) : null;

  const update = {
    subscriptionStatus: mapStatus(sub.status),
    ...(mapped ? { planId: mapped.planId, billingInterval: mapped.interval } : {}),
    ...(sub.currentBillingPeriod?.endsAt
      ? { currentPeriodEnd: new Date(sub.currentBillingPeriod.endsAt) }
      : {}),
    paddleCustomerId:     sub.customerId,
    paddleSubscriptionId: sub.id,
  };

  const query = companyId ? { _id: companyId } : { paddleCustomerId: sub.customerId };
  await Companies.updateOne(query, { $set: update });
};

export const paddleWebhookHandler = async (req, res) => {
  const signature = req.headers["paddle-signature"];
  const secret    = process.env.PADDLE_WEBHOOK_SECRET;

  let event;
  try {
    // req.body is a raw Buffer (express.raw). unmarshal verifies the signature
    // and throws if it doesn't match — same guarantee as Stripe's constructEvent.
    event = await paddle.webhooks.unmarshal(req.body.toString("utf8"), secret, signature);
  } catch (err) {
    console.error("❌ paddle webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.eventType) {
      // card entered + subscription born, plan switch, renewal, recovery
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionPastDue: {
        await applySubscription(event.data);   // status already correct on the object
        break;
      }

      // fully cancelled
      case EventName.SubscriptionCanceled: {
        const companyId  = event.data.customData?.companyId;
        const customerId = event.data.customerId;
        await Companies.updateOne(
          companyId ? { _id: companyId } : { paddleCustomerId: customerId },
          { $set: { subscriptionStatus: "canceled", planId: null, billingInterval: null } }
        );
        break;
      }

      default:
        break; // everything else is fine to ignore
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // 500 → Paddle retries later, which is what we want on a transient DB blip
    console.error(`❌ paddle webhook handling (${event.eventType}):`, err.message);
    return res.status(500).json({ message: "Webhook handling failed." });
  }
};