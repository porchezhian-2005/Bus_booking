import AppDataSource from "../config/database.js";
import TransactionEntity from "../models/Transaction.js";
import RazorpayService from "./razorpayService.js";

/**
 * Payment Service
 * Application-service layer for payment business logic & gateway workflow orchestration
 */
export class PaymentService {
  constructor(transactionRepository = null, razorpayService = null, bookingService = null, transactionService = null) {
    this.transactionRepository = transactionRepository || AppDataSource.getRepository(TransactionEntity);
    this.razorpayService = razorpayService || new RazorpayService();
    this.bookingService = bookingService;
    this.transactionService = transactionService;
  }

  /**
   * Create Razorpay Payment Order & Persist PENDING Transaction
   */
  async createRazorpayBookingOrder(userId, { tripId, seatIds, couponCode, useWallet }) {
    if (!this.bookingService) {
      const { bookingService } = await import("../controller/bookingController.js");
      this.bookingService = bookingService;
    }

    // Calculate authoritative payment amount from DB
    const calculation = await this.bookingService.calculateBookingAmount(userId, {
      tripId,
      seatIds,
      couponCode,
      useWallet,
    });

    const amountToCharge = calculation.finalAmountPaid;
    if (amountToCharge <= 0) {
      const error = new Error("No gateway payment required. Total amount is fully covered by Wallet or Discount.");
      error.statusCode = 400;
      throw error;
    }

    const receipt = `RCPT-${Date.now()}`;
    const notesPayload = {
      userId,
      tripId,
      seatIds: Array.isArray(seatIds) ? seatIds.join(",") : "",
    };
    const order = await this.razorpayService.createOrder(amountToCharge, receipt, notesPayload);

    // Save PENDING Transaction record to bind Razorpay Order ID to User and Payment Intent
    const pendingTxn = this.transactionRepository.create({
      transactionId: `TXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      bookingId: null,
      amount: amountToCharge,
      paymentMethod: "GATEWAY",
      paymentStatus: "PENDING",
      razorpayOrderId: order.id,
      orderMetadata: JSON.stringify({
        tripId,
        seatIds: Array.isArray(seatIds) ? seatIds.slice().sort() : [],
        couponCode: couponCode || null,
        useWallet: !!useWallet,
      }),
    });
    await this.transactionRepository.save(pendingTxn);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_GATEWAY_KEY_ID,
    };
  }

  /**
   * Verify Razorpay Payment Signature & Record Successful Transaction
   */
  async verifyRazorpayPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, amount }) {
    const isValid = this.razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      const error = new Error("Invalid Razorpay payment signature! Payment verification failed.");
      error.statusCode = 400;
      throw error;
    }

    // Log successful transaction
    if (this.transactionService) {
      await this.transactionService.createTransaction({
        userId,
        bookingId: bookingId || null,
        amount: amount || 0,
        paymentMethod: "RAZORPAY_GATEWAY",
        paymentStatus: "SUCCESS",
        gatewayReferenceId: razorpay_payment_id,
      });
    }

    return {
      paymentId: razorpay_payment_id,
    };
  }
}

export default PaymentService;
