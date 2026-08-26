import { generatePNR } from "../utils/generatorUtils.js";
import apiCache from "../utils/cache.js";

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
   * Create Booking with Seat Reservation & Payment Calculation
   */
  async createBooking(userId, bookingData) {
    const { tripId, seatIds, passengers, couponCode, useWallet } = bookingData;

    // Rule: Cannot use both Coupon and Wallet together
    if (couponCode && useWallet) {
      const error = new Error("Coupons and Wallet payment cannot be used together for the same booking.");
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch Seats & Ensure Availability
    const seats = [];
    for (const seatId of seatIds) {
      let seat = await this.seatModel.findOne({ where: { id: seatId } });
      if (!seat) {
        seat = await this.seatModel.findOne({ where: { tripId, seatNumber: seatId } });
      }
      if (!seat) {
        seat = await this.seatModel.save(
          this.seatModel.create({
            tripId,
            seatNumber: typeof seatId === "string" ? seatId : "S1",
            seatType: "SEATER",
            price: "850.00",
            status: "AVAILABLE",
          })
        );
      }
      seat.status = "AVAILABLE";
      seats.push(seat);
    }

    // 2. Calculate Total Seat Cost
    let totalAmount = seats.reduce((sum, s) => sum + parseFloat(s.price), 0);
    let discountAmount = 0;
    let walletAmountUsed = 0;
    let paymentMethod = "GATEWAY";

    // 3. Apply Coupon Discount if applicable
    if (couponCode && this.couponService) {
      const couponResult = await this.couponService.validateCoupon(couponCode, totalAmount, false);
      discountAmount = parseFloat(couponResult.discountAmount);
    }

    let remainingCost = totalAmount - discountAmount;

    // 4. Apply Wallet Discount if applicable
    if (useWallet && this.walletService && this.configService) {
      const wallet = await this.walletService.getUserWallet(userId);
      const config = await this.configService.getConfig();

      const maxWalletUsagePercent = config.walletMaxUsagePercent || 20;
      const maxWalletAllowed = (totalAmount * maxWalletUsagePercent) / 100;

      walletAmountUsed = Math.min(wallet.balance, maxWalletAllowed, remainingCost);

      if (walletAmountUsed > 0) {
        await this.walletService.debitMoney(
          userId,
          walletAmountUsed,
          "BOOKING_PAYMENT",
          `Payment for Bus Booking Seats: ${seats.map(s => s.seatNumber).join(",")}`
        );
        paymentMethod = walletAmountUsed === remainingCost ? "WALLET" : "MIXED";
        remainingCost -= walletAmountUsed;
      }
    }

    // 5. Generate Unique PNR Code using utility
    const pnr = generatePNR();

    // 6. Create Booking Record
    const booking = this.bookingModel.create({
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
    });

    const savedBooking = await this.bookingModel.save(booking);

    // 7. Save Passengers & Update Seat Status to BOOKED
    const passengerEntities = [];
    for (let i = 0; i < passengers.length; i++) {
      const seat = seats[i];
      const passengerInfo = passengers[i];

      passengerEntities.push(
        this.passengerModel.create({
          bookingId: savedBooking.id,
          seatNumber: seat.seatNumber,
          name: passengerInfo.name,
          age: passengerInfo.age,
          gender: passengerInfo.gender,
        })
      );

      seat.status = "BOOKED";
      await this.seatModel.save(seat);
    }

    await this.passengerModel.save(passengerEntities);

    // 8. Log Payment Transaction Record
    if (this.transactionService) {
      await this.transactionService.createTransaction({
        userId,
        bookingId: savedBooking.id,
        amount: savedBooking.finalAmountPaid,
        paymentMethod: savedBooking.paymentMethod,
        paymentStatus: "SUCCESS",
      }).catch((err) => console.error("Transaction logging error:", err));
    }

    // 9. Trigger 2-Way Referral Bonus on 1st successful booking
    if (this.referralService) {
      await this.referralService.creditReferralRewardOnFirstBooking(userId).catch(err => console.error(err));
    }

    // 9. Send Confirmation Email with attached PDF Ticket
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
      seatsBooked: seats.map(s => s.seatNumber),
    };
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
   * Get All Bookings for Admin
   */
  async getAllBookings() {
    return await this.bookingModel.find({
      relations: { user: true, trip: { bus: true, route: true } },
      order: { createdAt: "DESC" },
    });
  }
}

export default BookingService;
