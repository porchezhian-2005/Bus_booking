import { In } from "typeorm";
import { generatePNR } from "../utils/generatorUtils.js";
import apiCache from "../utils/cache.js";
import AppDataSource from "../config/database.js";
import TransactionEntity from "../models/Transaction.js";


/**
 * Booking Service
 * Orchestrates seat booking, coupon vs wallet rule validation, PNR generation,
 * referral bonus triggering on 1st booking, and ticket issuance.
 */
export class BookingService {
  constructor(
    bookingModel,
    passengerModel,
    seatModel,
    tripModel,
    walletService,
    couponService,
    configService,
    referralService,
    emailService,
    ticketService,
    transactionService
  ) {
    this.bookingModel = bookingModel;
    this.passengerModel = passengerModel;
    this.seatModel = seatModel;
    this.tripModel = tripModel;
    this.walletService = walletService;
    this.couponService = couponService;
    this.configService = configService;
    this.referralService = referralService;
    this.emailService = emailService;
    this.ticketService = ticketService;
    this.transactionService = transactionService;
  }

  /**
   * Calculate Authoritative Booking Amount Server-Side
   */
  async calculateBookingAmount(userId, bookingData, entityManager = null, lockOptions = null) {
    const { tripId, seatIds, couponCode, useWallet } = bookingData;

    if (!tripId) {
      const error = new Error("tripId is required");
      error.statusCode = 400;
      throw error;
    }
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      const error = new Error("seatIds must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }
    if (couponCode && useWallet) {
      const error = new Error("Coupons and Wallet payment cannot be used together for the same booking.");
      error.statusCode = 400;
      throw error;
    }

    const em = entityManager || AppDataSource.manager;
    const seatRepo = em.getRepository(this.seatModel.target);

    const queryOptions = {
      where: [
        { id: In(seatIds), tripId },
        { seatNumber: In(seatIds), tripId },
      ],
    };
    if (lockOptions) {
      queryOptions.lock = lockOptions;
    }

    const rawSeats = await seatRepo.find(queryOptions);

    if (!rawSeats || rawSeats.length < seatIds.length) {
      for (const sId of seatIds) {
        const found = rawSeats.find((s) => s.id === sId || s.seatNumber === sId);
        if (!found) {
          const error = new Error(`Seat ${sId} not found for the specified trip`);
          error.statusCode = 404;
          throw error;
        }
      }
    }

    const now = new Date();
    for (const seat of rawSeats) {
      if (seat.status === "BOOKED") {
        const error = new Error(`Seat ${seat.seatNumber} is already booked by another user.`);
        error.statusCode = 400;
        throw error;
      }

      if (seat.status === "HELD") {
        if (seat.heldUntil && new Date(seat.heldUntil) <= now) {
          // EXPIRED HOLD: An expired hold is DEAD. User loses exclusive right.
          const error = new Error(`Seat hold for seat ${seat.seatNumber} has expired. Booking creation failed.`);
          error.statusCode = 409;
          throw error;
        }

        if (seat.heldBy && seat.heldBy !== userId) {
          const error = new Error(`Seat ${seat.seatNumber} is currently held by another user.`);
          error.statusCode = 409;
          throw error;
        }
      }
    }

    const totalAmount = rawSeats.reduce((sum, s) => sum + parseFloat(s.price), 0);
    let discountAmount = 0;
    let walletAmountUsed = 0;

    if (couponCode && this.couponService) {
      const couponResult = await this.couponService.validateCoupon(
        couponCode,
        totalAmount,
        false,
        userId,
        em
      );
      discountAmount = parseFloat(couponResult.discountAmount);
    }

    let remainingCost = totalAmount - discountAmount;

    if (useWallet && this.walletService && this.configService) {
      const wallet = await this.walletService.getUserWallet(userId);
      const config = await this.configService.getConfig();

      const maxWalletUsagePercent = config.walletMaxUsagePercent || 20;
      const maxWalletAllowed = (totalAmount * maxWalletUsagePercent) / 100;

      walletAmountUsed = Math.min(wallet.balance, maxWalletAllowed, remainingCost);
      remainingCost = Math.max(0, remainingCost - walletAmountUsed);
    }

    return {
      totalAmount,
      discountAmount,
      walletAmountUsed,
      finalAmountPaid: remainingCost,
      seats: rawSeats,
    };
  }

  /**
   * Create Booking with Seat Reservation & Payment Calculation
   */
  async createBooking(userId, bookingData) {
    const {
      tripId,
      seatIds,
      passengers,
      couponCode,
      useWallet,
      boardingPointId,
      droppingPointId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = bookingData;

    // Basic Input Validation
    if (!tripId) {
      const error = new Error("tripId is required");
      error.statusCode = 400;
      throw error;
    }
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      const error = new Error("seatIds must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }
    if (!passengers || !Array.isArray(passengers) || passengers.length !== seatIds.length) {
      const error = new Error("Passengers count must match seatIds count");
      error.statusCode = 400;
      throw error;
    }

    // Rule: Cannot use both Coupon and Wallet together
    if (couponCode && useWallet) {
      const error = new Error("Coupons and Wallet payment cannot be used together for the same booking.");
      error.statusCode = 400;
      throw error;
    }

    const RazorpayServiceModule = await import("./razorpayService.js");
    const razorpayService = new RazorpayServiceModule.default();

    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const seatRepo = transactionalEntityManager.getRepository(this.seatModel.target || "Seat");
      const bookingRepo = transactionalEntityManager.getRepository(this.bookingModel.target || "Booking");
      const passengerRepo = transactionalEntityManager.getRepository(this.passengerModel.target || "Passenger");
      const txnRepo = transactionalEntityManager.getRepository(this.transactionService?.transactionModel?.target || TransactionEntity);
      const routePointRepo = transactionalEntityManager.getRepository("RoutePoint");
      const tripRepo = transactionalEntityManager.getRepository(this.tripModel?.target || "Trip");

      // 0. Route Points Validation & Security Check
      const tripObj = await tripRepo.findOne({ where: { id: tripId } });
      if (!tripObj) {
        const error = new Error("Selected trip not found.");
        error.statusCode = 404;
        throw error;
      }

      const configuredPointsCount = await routePointRepo.count({
        where: { routeId: tripObj.routeId, isActive: true },
      });

      let bPointObj = null;
      let dPointObj = null;

      if (configuredPointsCount > 0) {
        if (!boardingPointId) {
          const error = new Error("boardingPointId is required for this trip.");
          error.statusCode = 400;
          throw error;
        }
        if (!droppingPointId) {
          const error = new Error("droppingPointId is required for this trip.");
          error.statusCode = 400;
          throw error;
        }

        bPointObj = await routePointRepo.findOne({ where: { id: boardingPointId, isActive: true } });
        if (!bPointObj) {
          const error = new Error("Selected boarding point not found or inactive.");
          error.statusCode = 404;
          throw error;
        }

        dPointObj = await routePointRepo.findOne({ where: { id: droppingPointId, isActive: true } });
        if (!dPointObj) {
          const error = new Error("Selected dropping point not found or inactive.");
          error.statusCode = 404;
          throw error;
        }

        // Security Check: Verify points belong to the Trip's Route
        if (bPointObj.routeId !== tripObj.routeId) {
          const error = new Error("Selected boarding point does not belong to this trip's route.");
          error.statusCode = 400;
          throw error;
        }
        if (dPointObj.routeId !== tripObj.routeId) {
          const error = new Error("Selected dropping point does not belong to this trip's route.");
          error.statusCode = 400;
          throw error;
        }

        // Type Check
        if (bPointObj.pointType !== "BOARDING" && bPointObj.pointType !== "BOTH") {
          const error = new Error("Selected point is not a valid boarding point.");
          error.statusCode = 400;
          throw error;
        }
        if (dPointObj.pointType !== "DROPPING" && dPointObj.pointType !== "BOTH") {
          const error = new Error("Selected point is not a valid dropping point.");
          error.statusCode = 400;
          throw error;
        }

        // Sequence Check
        if (bPointObj.sequenceOrder >= dPointObj.sequenceOrder) {
          const error = new Error("Boarding point must precede the dropping point on the route schedule.");
          error.statusCode = 400;
          throw error;
        }
      } else {
        if (boardingPointId) {
          bPointObj = await routePointRepo.findOne({ where: { id: boardingPointId, isActive: true } });
        }
        if (droppingPointId) {
          dPointObj = await routePointRepo.findOne({ where: { id: droppingPointId, isActive: true } });
        }
      }

      // 1. Calculate Booking Amount & Fetch Seats with pessimistic write locking to prevent race conditions
      const calc = await this.calculateBookingAmount(
        userId,
        { tripId, seatIds, couponCode, useWallet },
        transactionalEntityManager,
        { mode: "pessimistic_write" }
      );

      const seats = calc.seats;
      const totalAmount = calc.totalAmount;
      const discountAmount = calc.discountAmount;
      let walletAmountUsed = calc.walletAmountUsed;
      let remainingCost = calc.finalAmountPaid;
      let paymentMethod = "GATEWAY";

      // 4. Debit Wallet if applicable
      if (walletAmountUsed > 0) {
        const pnrReference = `PNR-DEBIT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        await this.walletService.debitMoney(
          userId,
          walletAmountUsed,
          "BOOKING_PAYMENT",
          `Payment for Bus Booking Seats: ${seats.map((s) => s.seatNumber).join(",")}`,
          pnrReference,
          transactionalEntityManager
        );

        paymentMethod = walletAmountUsed >= (totalAmount - discountAmount) ? "WALLET" : "MIXED";
      }

      // 5. Razorpay TEST Payment Verification (if remainingCost > 0)
      let gatewayRefId = null;
      let pendingTxn = null;
      if (remainingCost > 0) {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          const error = new Error("Razorpay TEST payment details (razorpay_order_id, razorpay_payment_id, razorpay_signature) are required to complete booking.");
          error.statusCode = 400;
          throw error;
        }

        // Pessimistic write lock on the PENDING transaction record to prevent concurrent double-processing
        pendingTxn = await txnRepo.findOne({
          where: { razorpayOrderId: razorpay_order_id },
          lock: { mode: "pessimistic_write" },
        });

        if (!pendingTxn) {
          const error = new Error("Invalid or unrecognized Razorpay order ID.");
          error.statusCode = 404;
          throw error;
        }

        // Verification Rule 1: User Ownership Check
        if (pendingTxn.userId !== userId) {
          const error = new Error("Razorpay order does not belong to the current authenticated user.");
          error.statusCode = 403;
          throw error;
        }

        // Verification Rule 2: Order Status Lifecycle Check (Prevent Replay/Reuse)
        if (pendingTxn.paymentStatus !== "PENDING") {
          const error = new Error("Razorpay order has already been processed or finalized.");
          error.statusCode = 409;
          throw error;
        }

        // Verification Rule 3: Payment Intent & Metadata Matching Check
        if (pendingTxn.orderMetadata) {
          try {
            const meta = JSON.parse(pendingTxn.orderMetadata);
            const sortedRequestSeats = Array.isArray(seatIds) ? seatIds.slice().sort().join(",") : "";
            const sortedMetaSeats = Array.isArray(meta.seatIds) ? meta.seatIds.slice().sort().join(",") : "";

            if (meta.tripId !== tripId || sortedRequestSeats !== sortedMetaSeats) {
              const error = new Error("Razorpay order was created for a different trip or set of seats.");
              error.statusCode = 400;
              throw error;
            }
          } catch (e) {
            if (e.statusCode) throw e;
            const error = new Error("Invalid Razorpay order metadata.");
            error.statusCode = 400;
            throw error;
          }
        }

        // Idempotency check: prevent duplicate processing of the same Razorpay payment
        const existingTxn = await txnRepo.findOne({ where: { gatewayReferenceId: razorpay_payment_id } });
        if (existingTxn) {
          const error = new Error("Duplicate Razorpay payment ID detected. Payment has already been processed.");
          error.statusCode = 409;
          throw error;
        }

        // Verify HMAC Signature Server-Side
        const isValidSignature = razorpayService.verifyPaymentSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        );

        if (!isValidSignature) {
          const error = new Error("Invalid Razorpay TEST payment signature! Verification failed.");
          error.statusCode = 400;
          throw error;
        }

        // Verify Razorpay Order Amount Server-Side (Problem #1 fix)
        try {
          const razorpayOrder = await razorpayService.fetchOrder(razorpay_order_id);
          const expectedPaise = Math.round(remainingCost * 100);
          if (razorpayOrder && razorpayOrder.amount !== expectedPaise) {
            const error = new Error(
              `Razorpay payment order amount mismatch! Expected ₹${remainingCost.toFixed(2)} (${expectedPaise} paise), but Razorpay order was created for ₹${(razorpayOrder.amount / 100).toFixed(2)} (${razorpayOrder.amount} paise).`
            );
            error.statusCode = 400;
            throw error;
          }
        } catch (fetchErr) {
          if (fetchErr.statusCode === 400) throw fetchErr;
          console.error("Razorpay order verification error:", fetchErr.message);
          const error = new Error(`Razorpay order verification failed: ${fetchErr.message}`);
          error.statusCode = 400;
          throw error;
        }

        gatewayRefId = razorpay_payment_id;
      }

      // 6. Generate Unique PNR Code
      const pnr = generatePNR();

      // 7. Save Booking Record
      const booking = bookingRepo.create({
        pnr,
        userId,
        tripId,
        totalAmount: totalAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        walletAmountUsed: walletAmountUsed.toFixed(2),
        finalAmountPaid: remainingCost.toFixed(2),
        paymentMethod,
        paymentStatus: "PAID",
        bookingStatus: "CONFIRMED",
        couponCode: couponCode || null,
        boardingPointId: bPointObj ? bPointObj.id : null,
        droppingPointId: dPointObj ? dPointObj.id : null,
        boardingPointName: bPointObj ? bPointObj.locationName : null,
        droppingPointName: dPointObj ? dPointObj.locationName : null,
      });

      const savedBooking = await bookingRepo.save(booking);

      // 8. Save Passengers & Update Seat Status to BOOKED
      const passengerEntities = [];
      for (let i = 0; i < passengers.length; i++) {
        const seat = seats[i];
        const passengerInfo = passengers[i];

        passengerEntities.push(
          passengerRepo.create({
            bookingId: savedBooking.id,
            seatNumber: seat.seatNumber,
            name: passengerInfo.name,
            age: passengerInfo.age,
            gender: passengerInfo.gender,
          })
        );

        seat.status = "BOOKED";
        seat.heldBy = null;
        seat.heldUntil = null;
        await seatRepo.save(seat);
      }

      await passengerRepo.save(passengerEntities);

      // 9. Log / Update Payment Transaction Record
      if (txnRepo) {
        if (pendingTxn) {
          // Transition PENDING transaction to SUCCESS atomically
          pendingTxn.bookingId = savedBooking.id;
          pendingTxn.paymentStatus = "SUCCESS";
          pendingTxn.gatewayReferenceId = gatewayRefId;
          pendingTxn.amount = savedBooking.finalAmountPaid;
          pendingTxn.paymentMethod = savedBooking.paymentMethod;
          await txnRepo.save(pendingTxn);
        } else {
          // Pure Wallet payment flow
          const txn = txnRepo.create({
            transactionId: `TXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
            userId,
            bookingId: savedBooking.id,
            amount: savedBooking.finalAmountPaid,
            paymentMethod: savedBooking.paymentMethod,
            paymentStatus: "SUCCESS",
            gatewayReferenceId: `WALLET-${savedBooking.pnr}`,
          });
          await txnRepo.save(txn);
        }
      }

      // 10. Trigger Referral Bonus if referee's 1st booking
      if (this.referralService) {
        const previousBookingsCount = await bookingRepo.count({
          where: { userId, bookingStatus: "CONFIRMED" },
        });

        if (previousBookingsCount === 1) {
          await this.referralService.creditReferralRewardOnFirstBooking(userId, transactionalEntityManager)
            .catch((err) => console.error("Referral credit error:", err.message));
        }
      }

      return savedBooking;
    }).then(async (savedBooking) => {
      // Post-transaction operations: Send Email & clear cache
      if (this.emailService && this.ticketService) {
        try {
          const ticketDetails = await this.ticketService.getTicketDetails(savedBooking.pnr);
          const pdfBuffer = await this.ticketService.generateTicketPDFBuffer(savedBooking.pnr);

          await this.emailService.sendTemplateEmail(
            ticketDetails.passengers[0] ? ticketDetails.passengers[0].email || "user@example.com" : "user@example.com",
            `Booking Confirmed! PNR: ${savedBooking.pnr} 🚌`,
            "bookingConfirmation",
            {
              name: ticketDetails.passengers[0] ? ticketDetails.passengers[0].name : "Passenger",
              pnr: savedBooking.pnr,
              source: ticketDetails.source,
              destination: ticketDetails.destination,
              departureDate: ticketDetails.departureDate,
              departureTime: ticketDetails.departureTime,
              busName: ticketDetails.busName,
              busNumber: ticketDetails.busNumber,
              finalAmountPaid: savedBooking.finalAmountPaid,
              paymentMethod: savedBooking.paymentMethod,
              pdfDownloadUrl: `${process.env.APP_URL || "http://localhost:5000"}/api/tickets/${savedBooking.pnr}/pdf`,
            },
            [
              {
                filename: `Ticket-${savedBooking.pnr}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ]
          );
        } catch (emailErr) {
          console.error("Failed to send booking confirmation email with PDF attachment:", emailErr.message);
        }
      }

      apiCache.clear();

      return {
        bookingId: savedBooking.id,
        pnr: savedBooking.pnr,
        totalAmount: savedBooking.totalAmount,
        discountAmount: savedBooking.discountAmount,
        walletAmountUsed: savedBooking.walletAmountUsed,
        finalAmountPaid: savedBooking.finalAmountPaid,
        paymentMethod: savedBooking.paymentMethod,
        bookingStatus: savedBooking.bookingStatus,
      };
    });
  }


  /**
   * Get User Bookings History
   */
  async getUserBookings(userId) {
    return await this.bookingModel.find({
      where: { userId },
      relations: { trip: { bus: true, route: true } },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get All Bookings for Admin with Database-Level Filtering & Relation Joining
   */
  async getAllBookings(query = {}) {
    const { status, date, paymentMethod, search, source, destination } = query;

    const queryBuilder = this.bookingModel
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.user", "user")
      .leftJoinAndSelect("booking.trip", "trip")
      .leftJoinAndSelect("trip.bus", "bus")
      .leftJoinAndSelect("trip.route", "route")
      .leftJoinAndSelect("booking.passengers", "passengers")
      .orderBy("booking.createdAt", "DESC");

    // 1. Status Filter (DB Level)
    if (status && status.trim() !== "") {
      queryBuilder.andWhere("UPPER(booking.bookingStatus) = :status", {
        status: status.trim().toUpperCase(),
      });
    }

    // 2. Payment Method Filter (DB Level)
    if (paymentMethod && paymentMethod.trim() !== "") {
      queryBuilder.andWhere("UPPER(booking.paymentMethod) = :paymentMethod", {
        paymentMethod: paymentMethod.trim().toUpperCase(),
      });
    }

    // 3. Date Filter (DB Level: Trip departureDate OR Booking createdAt range)
    if (date && date.trim() !== "") {
      const cleanDate = date.trim();
      const startDate = `${cleanDate} 00:00:00`;
      const endDate = `${cleanDate} 23:59:59.999`;
      queryBuilder.andWhere(
        "(trip.departureDate = :cleanDate OR (booking.createdAt >= :startDate AND booking.createdAt <= :endDate))",
        { cleanDate, startDate, endDate }
      );
    }

    // 4. Source Filter (DB Level: Route source partial match)
    if (source && source.trim() !== "") {
      queryBuilder.andWhere("LOWER(route.source) LIKE :source", {
        source: `%${source.trim().toLowerCase()}%`,
      });
    }

    // 5. Destination Filter (DB Level: Route destination partial match)
    if (destination && destination.trim() !== "") {
      queryBuilder.andWhere("LOWER(route.destination) LIKE :destination", {
        destination: `%${destination.trim().toLowerCase()}%`,
      });
    }

    // 6. Search Term Filter (DB Level: PNR / User Name / User Email partial match)
    if (search && search.trim() !== "") {
      const sTerm = `%${search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        "(LOWER(booking.pnr) LIKE :sTerm OR LOWER(user.name) LIKE :sTerm OR LOWER(user.email) LIKE :sTerm)",
        { sTerm }
      );
    }

    const bookings = await queryBuilder.getMany();
    return bookings || [];
  }
}

export default BookingService;

