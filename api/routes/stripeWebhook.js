// api/routes/stripeWebhook.js
// The webhook keeps your DB in sync with Stripe. CRITICAL MOUNTING
// RULE: Stripe signature verification needs the RAW request body, so
// this route must be registered BEFORE app.use(express.json()):
//
//     import { stripeWebhookHandler } from "./routes/stripeWebhook.js";
//     app.post(
//       "/api/stripe/webhook",
//       express.raw({ type: "application/json" }),
//       stripeWebhookHandler
//     );
//     // ...and ONLY AFTER that line:
//     app.use(express.json());
//
// If express.json() runs first it consumes the body and every webhook
// fails signature verification with no obvious error.
//
// Local testing (self-signed HTTPS on :5000 → note --skip-verify):
//     stripe listen --skip-verify --forward-to https://localhost:5000/api/stripe/webhook
// The command prints your whsec_... → STRIPE_WEBHOOK_SECRET in .env.

import Stripe from "stripe";
import Companies from "../models/Companies.js";     // 👈 adjust
import { planFromPriceId } from "../config/plans.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* apply a Stripe subscription object onto the company document */
const applySubscription = async (sub) => {
  const companyId = sub.metadata?.companyId;
  const priceId   = sub.items?.data?.[0]?.price?.id;
  const mapped    = priceId ? planFromPriceId(priceId) : null;

  const update = {
    subscriptionStatus: sub.status,   // active | past_due | canceled | unpaid | ...
    ...(mapped ? { planId: mapped.planId, billingInterval: mapped.interval } : {}),
    ...(sub.current_period_end
      ? { currentPeriodEnd: new Date(sub.current_period_end * 1000) }
      : {}),
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
  };

  // prefer the metadata companyId; fall back to the customer id
  const query = companyId
    ? { _id: companyId }
    : { stripeCustomerId: update.stripeCustomerId };

  await Companies.updateOne(query, { $set: update });
};

export const stripeWebhookHandler = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                              // RAW buffer — see mounting rule
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // card entered, subscription born
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(sub);
        }
        break;
      }

      // plan changes, renewals, cancellations-at-period-end, portal edits
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await applySubscription(event.data.object);
        break;
      }

      // fully gone
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const companyId  = sub.metadata?.companyId;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        await Companies.updateOne(
          companyId ? { _id: companyId } : { stripeCustomerId: customerId },
          { $set: { subscriptionStatus: "canceled", planId: null, billingInterval: null } }
        );
        break;
      }

      // renewal card declined
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
        if (customerId) {
          await Companies.updateOne(
            { stripeCustomerId: customerId },
            { $set: { subscriptionStatus: "past_due" } }
          );
        }
        break;
      }

      default:
        // other events are fine to ignore
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // 500 → Stripe retries later, which is what we want on a DB blip
    console.error(`❌ webhook handling (${event.type}):`, err.message);
    return res.status(500).json({ message: "Webhook handling failed." });
  }
};