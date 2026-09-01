import AppDataSource from "../config/database.js";
import TransactionEntity from "../models/Transaction.js";
import RazorpayService from "../services/razorpayService.js";
import TransactionService from "../services/transactionService.js";
import PaymentService from "../services/paymentService.js";
import { bookingService } from "./bookingController.js";

const paymentTxnRepository = AppDataSource.getRepository(TransactionEntity);
const razorpayService = new RazorpayService();
const transactionService = new TransactionService(paymentTxnRepository);

export const paymentService = new PaymentService(
  paymentTxnRepository,
  razorpayService,
  bookingService,
  transactionService
);

/**
 * 1. Create Razorpay Order for Ticket Booking
 */
export const createRazorpayBookingOrder = async (req, res) => {
  try {
    const orderData = await paymentService.createRazorpayBookingOrder(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      data: orderData,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

/**
 * 2. Verify Razorpay Payment Signature
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const result = await paymentService.verifyRazorpayPayment(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Razorpay payment verified successfully!",
      paymentId: result.paymentId,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

/**
 * 3. Cancel / Release Temporary Seat Hold
 */
export const cancelRazorpayHold = async (req, res) => {
  try {
    const result = await paymentService.cancelHold(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Seat hold released successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to release seat hold",
    });
  }
};

/**
 * 4. Add Money to Wallet via Razorpay (Disabled)
 */
export const addMoneyToWalletViaRazorpay = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Manual wallet top-up is disabled. Wallet balance is earned exclusively through Referral Rewards and Ticket Cancellation Refunds.",
  });
};
