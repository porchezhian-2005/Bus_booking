import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import busRoutes from "./routes/busRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";
import { setupSwagger } from "./config/swagger.js";

dotenv.config();

const app = express();

// Security Middlewares: Helmet & Rate Limiting
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allows cross-origin media & assets
  })
);

// Global Rate Limiter: 200 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes" },
});

// Stricter Rate Limiter for Authentication: 30 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login/register attempts, please try again in 15 minutes" },
});

app.use(globalLimiter);

// Initialize Swagger Documentation
setupSwagger(app);

// Middlewares & CORS Policy Configuration
const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:5173", "http://localhost:5174"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/config", configRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/payments", paymentRoutes);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Bus Booking Backend API is running securely with Helmet & Rate Limiting" });
});

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
