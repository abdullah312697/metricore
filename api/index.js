import express, { json } from "express";
import fs from "fs";
import https from "https";
import http from "http"; 
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import webpush from "web-push";
import { initSocket } from "./socket/socket.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { verifySmtpConnection } from "./mailer.js";
// =========================
// ✅ Import Route Modules
// =========================
import productData from "./routes/deshbord.js";
import userRouter from "./routes/UserProcess.js";
import sliderAction from "./routes/SliderAction.js";
import CustomerReview from "./routes/CustomerReview.js";
import contactRoutes from "./routes/contactRoutes.js";
import AddOrder from "./routes/AddOrder.js";
import Facebook from "./routes/Facebook.js";
import Banner from "./routes/Banner.js";
import Setmytarget from "./routes/Setmytarget.js";
import AddEmplyee from "./routes/AddEmplyee.js";
import ClientAddProduct from "./routes/ClientAddProduct.js";
import conversationRoutes from "./routes/conversation.js";
import messageRoutes from "./routes/message.js";
import callsRoutes from "./routes/calls.js";
import produstData from "./routes/ProductData.js";
import ExtraFieldAdd from "./routes/ExtraFieldAdd.js";
import TargetAmountRoute from "./routes/TargetAmountRoute.js";
import ChartData from "./routes/ChartData.js";
import ingestRoutes  from "./routes/ingestRoutes.js";
import apiKeyRoutes  from "./routes/apiKeyRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import { paddleWebhookHandler } from "./routes/paddleWebhook.js";
import paddleRoutes from "./routes/paddleRoutes.js";
import { requireActiveSubscription } from "./middleware/requireActiveSubscription.js";

//=================admin=====================//
import adminStatsRoutes from "./routes/adminStatsRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminCompanyRoutes from "./routes/adminCompanyRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import adminFeedbackRoutes from "./routes/adminFeedbackRoutes.js";
import adminAnnouncementRoutes from "./routes/adminAnnouncementRoutes.js";
// import { stripeWebhookHandler } from "./routes/stripeWebhook.js";
// import stripeRoutes, { requireActiveSubscription } from "./routes/stripeRoutes.js";
import adminBillingRoutes from "./routes/adminBillingRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
// =========================
// ✅ App Initialization
// =========================
const app = express();
app.set("trust proxy", true);
mongoose.set("strictQuery", false);
mongoose.set("bufferCommands", false); 
// =========================
// ✅ Middleware Setup
// =========================
// app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.post("/api/paddle/webhook", express.raw({ type: "application/json" }), paddleWebhookHandler);
app.use(json());
app.use("/api/paddle", paddleRoutes);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

verifySmtpConnection().then((r) => !r.ok && console.error("⚠️", r.error));

const apiV1Limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Authenticated requests → limit per API key (the real identity)
    const auth = req.headers.authorization;
    if (auth) return auth;
    // Unauthenticated (missing key) → limit per IP, IPv6-safe
    return ipKeyGenerator(req.ip);
  },
  message: { error: "rate_limited", message: "Too many requests — max 60 per minute per key." },
});
// =========================
// ✅ CORS Configuration
// =========================
const allowedOrigins = [
  "http://localhost:3000",
  "https://metricore.app",
  "https://www.metricore.app",
  "https://motricore.netlify.app",
  "http://10.88.231.23:3000",
  "https://10.88.231.23:3000"
];

const useCors =   cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow mobile apps or Postman
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });

app.use(useCors);


// =========================
// ✅ API Routes
// =========================
app.use("/api/users", userRouter);
app.use("/api/addproduct", productData);
app.use("/api/slider", sliderAction);
app.use("/api/review", CustomerReview);
app.use("/api/order", AddOrder);
app.use("/api/contact", contactRoutes);
app.use("/api/facebook", Facebook);
app.use("/api/banner", Banner);
app.use("/api/setgole", requireActiveSubscription, Setmytarget);
app.use("/api/newemplyee", requireActiveSubscription, AddEmplyee);
app.use("/api/newproduct", requireActiveSubscription, ClientAddProduct);
app.use("/api/conversation", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callsRoutes);
app.use("/api/productdata", requireActiveSubscription, produstData);
app.use("/api/extrafield", requireActiveSubscription, ExtraFieldAdd);
app.use("/api/goalTarget", TargetAmountRoute);
app.use("/api/chart", ChartData);
app.use("/api/v1", apiV1Limiter, ingestRoutes); 
app.use("/api/apikeys", apiKeyRoutes);  
app.use("/api/export", exportRoutes);  

// admin dashbord 
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", adminStatsRoutes);
app.use("/api/admin", adminCompanyRoutes);
app.use("/api/feedback", feedbackRoutes);        // company side
app.use("/api/admin",    adminFeedbackRoutes);   // admin side
app.use("/api/admin",         adminAnnouncementRoutes);  
app.use("/api/admin", adminBillingRoutes);
app.use("/api/announcements", announcementRoutes);        // company feed
// payment
// app.use("/api/stripe", stripeRoutes);

// =========================
// ✅ HTTP & Socket.IO Setup
// =========================
// const server = https.createServer(
//   {
//     key: fs.readFileSync("./cert/key.pem"),
//     cert: fs.readFileSync("./cert/cert.pem"),
//   },
//   app
// );

// initSocket(server, allowedOrigins);
let server;

if (process.env.NODE_ENV === "production") {
  // Railway/Render terminate SSL in front of the app — run plain HTTP behind it.
  // The cert files don't exist there, so we must NOT read them.
  server = http.createServer(app);
} else {
  // Local dev — your self-signed HTTPS, exactly as before.
  server = https.createServer(
    {
      key: fs.readFileSync("./cert/key.pem"),
      cert: fs.readFileSync("./cert/cert.pem"),
    },
    app
  );
}

initSocket(server, allowedOrigins);
// =========================
// ✅ Web Push Configuration
// =========================
webpush.setVapidDetails(
  "mailto:nut-metricore.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      family: 4,
      serverSelectionTimeoutMS: 5000
    });

    console.log("✅ Database connection successful");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running at http://192.168.8.103:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // stop app if DB fails
  }
};

startServer();