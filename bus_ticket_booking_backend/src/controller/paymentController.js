import AppDataSource from "../config/database.js";
import BookingEntity from "../models/Booking.js";
import PassengerEntity from "../models/Passenger.js";
import SeatEntity from "../models/Seat.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import TransactionEntity from "../models/Transaction.js";

import RazorpayService from "../services/razorpayService.js";
import BookingService from "../services/bookingService.js";
import WalletService from "../services/walletService.js";
import TransactionService from "../services/transactionService.js";

const bookingRepository = AppDataSource.getRepository(BookingEntity);
const passengerRepository = AppDataSource.getRepository(PassengerEntity);
const seatRepository = AppDataSource.getRepository(SeatEntity);
const walletRepository = AppDataSource.getRepository(WalletEntity);
const transactionRepository = AppDataSource.getRepository(WalletTransactionEntity);
const paymentTxnRepository = AppDataSource.getRepository(TransactionEntity);

const razorpayService = new RazorpayService();
const walletService = new WalletService(walletRepository, transactionRepository);
const transactionService = new TransactionService(paymentTxnRepository);

/**
 * 1. Create Razorpay Order for Ticket Booking
 */
export const createRazorpayBookingOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const receipt = `RCPT-${Date.now()}`;
    const order = await razorpayService.createOrder(amount, receipt);

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_GATEWAY_KEY_ID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

/**
 * 2. Verify Razorpay Payment & Confirm Booking
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const isValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature! Payment verification failed.",
      });
    }

    // Log successful transaction
    await transactionService.createTransaction({
      userId: req.user.id,
      bookingId: bookingId || null,
      amount: req.body.amount || 0,
      paymentMethod: "RAZORPAY_GATEWAY",
      paymentStatus: "SUCCESS",
      gatewayReferenceId: razorpay_payment_id,
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay payment verified successfully!",
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

/**
 * 3. Add Money to Wallet via Razorpay
 */
export const addMoneyToWalletViaRazorpay = async (req, res) => {
  try {
    const { amount, razorpay_payment_id } = req.body;

    const result = await walletService.addMoney(
      req.user.id,
      parseFloat(amount),
      `RAZORPAY-${razorpay_payment_id || Date.now()}`
    );

    await transactionService.createTransaction({
      userId: req.user.id,
      amount: parseFloat(amount),
      paymentMethod: "RAZORPAY_GATEWAY",
      paymentStatus: "SUCCESS",
      gatewayReferenceId: razorpay_payment_id || `RAZORPAY-${Date.now()}`,
    });

    return res.status(200).json({
      success: true,
      message: "Money added to wallet successfully via Razorpay!",
      data: { newBalance: result.newBalance },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add money via Razorpay",
    });
  }
};
