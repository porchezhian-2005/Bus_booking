import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import UserEntity from "../models/User.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import ReferralEntity from "../models/Referral.js";
import SystemConfigEntity from "../models/SystemConfig.js";
import BusEntity from "../models/Bus.js";
import RouteEntity from "../models/Route.js";
import TripEntity from "../models/Trip.js";
import SeatEntity from "../models/Seat.js";
import CouponEntity from "../models/Coupon.js";
import BookingEntity from "../models/Booking.js";
import PassengerEntity from "../models/Passenger.js";
import TransactionEntity from "../models/Transaction.js";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "bus_booking_db",
  synchronize: process.env.NODE_ENV !== "production", // Auto-create tables in dev, safe in prod
  logging: false,
  ssl: process.env.DB_SSL === "true" || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  entities: [
    UserEntity,
    WalletEntity,
    WalletTransactionEntity,
    ReferralEntity,
    SystemConfigEntity,
    BusEntity,
    RouteEntity,
    TripEntity,
    SeatEntity,
    CouponEntity,
    BookingEntity,
    PassengerEntity,
    TransactionEntity,
  ],
  migrations: [],
  subscribers: [],
});

export const connectDB = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("PostgreSQL Database connected");
    }
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export default AppDataSource;
