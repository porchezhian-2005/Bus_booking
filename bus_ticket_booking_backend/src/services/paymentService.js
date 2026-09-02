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
   * Create Razorpay Payment Order & Persist PENDING Transaction with 10-Minute Decoupled Seat Hold
   */
  async createRazorpayBookingOrder(userId, { tripId, seatIds, passengers, boardingPointId, droppingPointId, couponCode, useWallet }) {
    if (!this.bookingService) {
      const { bookingService } = await import("../controller/bookingController.js");
      this.bookingService = bookingService;
    }

    if (!tripId || !Array.isArray(seatIds) || seatIds.length === 0) {
      const error = new Error("tripId and seatIds are required");
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();
    const heldUntil = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    let amountToCharge = 0;

    // STEP 1: DB Transaction 1 - Acquire pessimistic lock on Seat rows & place 10-minute hold
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const seatRepo = transactionalEntityManager.getRepository("Seat");

      // Pessimistic write lock on seats
      const seats = await seatRepo.find({
        where: { tripId },
        lock: { mode: "pessimistic_write" },
      });

      const requestedSeats = seats.filter((s) => seatIds.includes(s.id));
      if (requestedSeats.length !== seatIds.length) {
        const error = new Error("One or more selected seats were not found for this trip.");
        error.statusCode = 404;
        throw error;
      }

      for (const seat of requestedSeats) {
        if (seat.status === "BOOKED") {
          const error = new Error(`Seat ${seat.seatNumber} is already booked by another passenger.`);
          error.statusCode = 409;
          throw error;
        }

        // Active hold check by another user
        if (seat.status === "HELD" && seat.heldUntil && new Date(seat.heldUntil) > now && seat.heldBy !== userId) {
          const error = new Error(`Seat ${seat.seatNumber} is currently held by another passenger.`);
          error.statusCode = 409;
          throw error;
        }

        // Update seat to HELD
        seat.status = "HELD";
        seat.heldBy = userId;
        seat.heldUntil = heldUntil;
        await seatRepo.save(seat);
      }

      // Calculate authoritative payment amount from DB inside transaction
      const calculation = await this.bookingService.calculateBookingAmount(
        userId,
        { tripId, seatIds, couponCode, useWallet },
        transactionalEntityManager
      );

      amountToCharge = calculation.finalAmountPaid;
    });

    if (amountToCharge <= 0) {
      // Release held seats if amount is zero
      await this.cancelHold(userId, { tripId, seatIds });
      const error = new Error("No gateway payment required. Total amount is fully covered by Wallet or Discount.");
      error.statusCode = 400;
      throw error;
    }

    // STEP 2: Call Razorpay API outside DB transaction (No DB row locks held!)
    let order;
    try {
      const receipt = `RCPT-${Date.now()}`;
      const notesPayload = {
        userId,
        tripId,
        seatIds: seatIds.join(","),
      };
      order = await this.razorpayService.createOrder(amountToCharge, receipt, notesPayload);
    } catch (err) {
      // Compensating action: Release seat hold if Razorpay order creation fails
      await this.cancelHold(userId, { tripId, seatIds }).catch(() => {});
      throw err;
    }

    // STEP 3: DB Transaction 2 - Save PENDING Transaction record
    try {
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
          seatIds: seatIds.slice().sort(),
          passengers: Array.isArray(passengers) ? passengers : [],
          boardingPointId: boardingPointId || null,
          droppingPointId: droppingPointId || null,
          couponCode: couponCode || null,
          useWallet: !!useWallet,
        }),
      });
      await this.transactionRepository.save(pendingTxn);
    } catch (txnErr) {
      // Compensating action: Release seat hold if transaction save fails
      await this.cancelHold(userId, { tripId, seatIds }).catch(() => {});
      throw txnErr;
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      const error = new Error("Razorpay configuration error: RAZORPAY_KEY_ID is missing.");
      error.statusCode = 500;
      throw error;
    }

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId,
      heldUntil: heldUntil.toISOString(),
    };
  }

  /**
   * Cancel / Release Seat Hold
   */
  async cancelHold(userId, { tripId, seatIds }) {
    if (!tripId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return { success: true, releasedCount: 0 };
    }

    const seatRepo = AppDataSource.getRepository("Seat");
    const seats = await seatRepo.find({ where: { tripId } });
    const targetSeats = seats.filter((s) => seatIds.includes(s.id));
    let releasedCount = 0;

    for (const seat of targetSeats) {
      if (seat.status === "HELD" && seat.heldBy === userId) {
        seat.status = "AVAILABLE";
        seat.heldBy = null;
        seat.heldUntil = null;
        await seatRepo.save(seat);
        releasedCount++;
      }
    }

    return { success: true, releasedCount };
  }

  /**
   * Handle Razorpay Webhook Event Notifications
   */
  async handleRazorpayWebhook(rawBody, signature, payload) {
    if (!this.bookingService) {
      const { bookingService } = await import("../controller/bookingController.js");
      this.bookingService = bookingService;
    }

    const isValidSignature = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      const error = new Error("Invalid Razorpay webhook HMAC signature!");
      error.statusCode = 400;
      throw error;
    }

    if (!payload || !payload.event) {
      const error = new Error("Invalid webhook payload format!");
      error.statusCode = 400;
      throw error;
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;

    if (!razorpayOrderId) {
      return { success: true, message: `Ignored event ${event} without order_id` };
    }

    const pendingTxn = await this.transactionRepository.findOne({
      where: { razorpayOrderId },
    });

    if (!pendingTxn) {
      return { success: true, message: `No local transaction found for Razorpay order ID ${razorpayOrderId}` };
    }

    // Idempotency check: If already SUCCESS, return 200 OK
    if (pendingTxn.paymentStatus === "SUCCESS") {
      return { success: true, message: "Webhook event already processed (Idempotent)" };
    }

    if (event === "payment.captured" || event === "order.paid") {
      // Delegate fulfillment to unified bookingService
      const booking = await this.bookingService.finalizeBookingAndPayment(
        razorpayOrderId,
        razorpayPaymentId
      );

      return {
        success: true,
        message: "Razorpay webhook payment.captured processed & booking confirmed!",
        bookingId: booking.id,
        pnr: booking.pnr,
      };
    }

    if (event === "payment.failed") {
      // Log payment failure on Transaction while keeping active seat hold until expiry
      if (pendingTxn.paymentStatus === "PENDING") {
        pendingTxn.gatewayReferenceId = razorpayPaymentId || pendingTxn.gatewayReferenceId;
        await this.transactionRepository.save(pendingTxn);
      }
      return { success: true, message: "Razorpay webhook payment.failed logged successfully" };
    }

    return { success: true, message: `Webhook event ${event} received and acknowledged` };
  }
}

export default PaymentService;
