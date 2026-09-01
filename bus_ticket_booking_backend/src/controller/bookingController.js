import AppDataSource from "../config/database.js";
import BookingEntity from "../models/Booking.js";
import PassengerEntity from "../models/Passenger.js";
import SeatEntity from "../models/Seat.js";
import TripEntity from "../models/Trip.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import CouponEntity from "../models/Coupon.js";
import SystemConfigEntity from "../models/SystemConfig.js";
import ReferralEntity from "../models/Referral.js";
import UserEntity from "../models/User.js";

import TransactionEntity from "../models/Transaction.js";

import BookingService from "../services/bookingService.js";
import WalletService from "../services/walletService.js";
import CouponService from "../services/couponService.js";
import ConfigService from "../services/configService.js";
import ReferralService from "../services/referralService.js";
import EmailService from "../services/emailService.js";
import TicketService from "../services/ticketService.js";
import TransactionService from "../services/transactionService.js";

const bookingRepository = AppDataSource.getRepository(BookingEntity);
const passengerRepository = AppDataSource.getRepository(PassengerEntity);
const seatRepository = AppDataSource.getRepository(SeatEntity);
const tripRepository = AppDataSource.getRepository(TripEntity);
const walletRepository = AppDataSource.getRepository(WalletEntity);
const transactionRepository = AppDataSource.getRepository(WalletTransactionEntity);
const couponRepository = AppDataSource.getRepository(CouponEntity);
const configRepository = AppDataSource.getRepository(SystemConfigEntity);
const referralRepository = AppDataSource.getRepository(ReferralEntity);
const userRepository = AppDataSource.getRepository(UserEntity);
const paymentTxnRepository = AppDataSource.getRepository(TransactionEntity);

const emailService = new EmailService();
const walletService = new WalletService(walletRepository, transactionRepository);
const couponService = new CouponService(couponRepository, bookingRepository);
const configService = new ConfigService(configRepository);
const referralService = new ReferralService(userRepository, referralRepository, walletService, configRepository, emailService);
const ticketService = new TicketService(bookingRepository, passengerRepository, seatRepository, walletService);
const transactionService = new TransactionService(paymentTxnRepository);

const bookingService = new BookingService(
  bookingRepository,
  passengerRepository,
  seatRepository,
  tripRepository,
  walletService,
  couponService,
  configService,
  referralService,
  emailService,
  ticketService,
  transactionService
);

export const createBooking = async (req, res) => {
  try {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    return res.status(201).json({ success: true, message: "Bus ticket booked successfully!", data: booking });
  } catch (error) {
    console.error("CREATE BOOKING ERROR:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user.id);
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getAllBookings(req.query);
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

