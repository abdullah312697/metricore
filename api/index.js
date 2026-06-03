import express, { json } from "express";
import fs from "fs";
import https from "https";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import webpush from "web-push";
import { initSocket } from "./socket/socket.js";


// =========================
// ✅ Import Route Modules
// =========================
import productData from "./routes/deshbord.js";
import userRouter from "./routes/UserProcess.js";
import sliderAction from "./routes/SliderAction.js";
import CustomerReview from "./routes/CustomerReview.js";
import ContactTo from "./routes/ContactTo.js";
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
app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// =========================
// ✅ CORS Configuration
// =========================
const allowedOrigins = [
  "https://192.168.8.103:3000",
  "https://localhost:3000",
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
app.use("/api/contact", ContactTo);
app.use("/api/facebook", Facebook);
app.use("/api/banner", Banner);
app.use("/api/setgole", Setmytarget);
app.use("/api/newemplyee", AddEmplyee);
app.use("/api/newproduct", ClientAddProduct);
app.use("/api/conversation", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callsRoutes);
app.use("/api/productdata", produstData);
app.use("/api/extrafield", ExtraFieldAdd);
app.use("/api/goalTarget", TargetAmountRoute);
app.use("/api/chart", ChartData);
// =========================
// ✅ HTTP & Socket.IO Setup
// =========================
const server = https.createServer(
  {
    key: fs.readFileSync("./cert/key.pem"),
    cert: fs.readFileSync("./cert/cert.pem"),
  },
  app
);

initSocket(server, allowedOrigins);

// =========================
// ✅ Web Push Configuration
// =========================
webpush.setVapidDetails(
  "mailto:nothun.nt@gmail.com",
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