import PDFDocument from "pdfkit";
import AppDataSource from "../config/database.js";

/**
 * Ticket Service
 * Handles PDF Ticket Generation and Ticket Cancellation with Refund Calculation
 */
export class TicketService {

  constructor(bookingModel, passengerModel, seatModel, walletService) {
    this.bookingModel = bookingModel;
    this.passengerModel = passengerModel;
    this.seatModel = seatModel;
    this.walletService = walletService;
  }

  /**
   * Get Ticket Details by PNR or Booking ID
   */
  async getTicketDetails(pnr) {
    const booking = await this.bookingModel.findOne({
      where: { pnr },
      relations: { user: true, trip: { bus: true, route: true } },
    });

    if (!booking) {
      const error = new Error("Ticket not found for the given PNR");
      error.statusCode = 404;
      throw error;
    }

    const passengers = await this.passengerModel.find({ where: { bookingId: booking.id } });

    return {
      pnr: booking.pnr,
      bookingStatus: booking.bookingStatus || "CONFIRMED",
      paymentStatus: booking.paymentStatus || "PAID",
      paymentMethod: booking.paymentMethod || "ONLINE",
      totalAmount: booking.totalAmount,
      discountAmount: booking.discountAmount || "0.00",
      walletAmountUsed: booking.walletAmountUsed || "0.00",
      finalAmountPaid: booking.finalAmountPaid,
      source: booking.trip?.route?.source || "Source",
      destination: booking.trip?.route?.destination || "Destination",
      departureDate: booking.trip?.departureDate || "",
      departureTime: booking.trip?.departureTime || "",
      arrivalTime: booking.trip?.arrivalTime || "",
      busName: booking.trip?.bus?.name || "Express Bus",
      busType: booking.trip?.bus?.busType || "Bus Fleet",
      busNumber: booking.trip?.bus?.busNumber || "N/A",
      passengers,
      bookingDate: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
    };
  }

  /**
   * Render Ultra-Clean, Professional RedBus Official PDF E-Ticket Design
   */
  buildProfessionalTicketPDF(ticket, doc) {
    // 1. RedBus Brand Header Bar (Red Banner)
    doc.rect(0, 0, 612, 70).fill("#d84e55");
    
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#FFFFFF").text("redBus", 40, 20, { continued: true });
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#fecdd3").text(" PRO", { lineGap: 0 });
    doc.fontSize(9).font("Helvetica").fillColor("#f1f5f9").text("India's No. 1 Bus Ticket Booking Platform", 40, 45);

    // E-Ticket Status Badge
    doc.roundedRect(430, 20, 140, 28, 6).fill("#FFFFFF");
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#16a34a").text("✓ CONFIRMED TICKET", 440, 29, { width: 120, align: "center" });

    // 2. PNR Summary Box
    doc.roundedRect(40, 85, 532, 55, 6).fill("#f8fafc").stroke("#e2e8f0");

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b").text("BOOKING PNR NUMBER", 55, 95);
    doc.fontSize(15).font("Helvetica-Bold").fillColor("#d84e55").text(ticket.pnr, 55, 112);

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b").text("BOOKING DATE", 250, 95);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e293b").text(ticket.bookingDate, 250, 114);

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b").text("PAYMENT STATUS", 420, 95);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#16a34a").text(`${ticket.paymentStatus} (${ticket.paymentMethod})`, 420, 114);

    // 3. Journey Route & Operator Card
    doc.roundedRect(40, 150, 532, 105, 6).fill("#ffffff").stroke("#cbd5e1");

    // Operator Name
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#0f172a").text(ticket.busName, 55, 165);
    doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`${ticket.busType}  •  Reg No: ${ticket.busNumber}`, 55, 182);

    // Boarding City & Time
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#1e293b").text(ticket.source, 55, 205);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#d84e55").text(`Dep: ${ticket.departureTime}`, 55, 226);
    doc.fontSize(8).font("Helvetica").fillColor("#64748b").text(`Date: ${ticket.departureDate}`, 55, 238);

    // Clean Vector Line graphic in Middle (Replaces corrupted % % % % text arrow)
    doc.moveTo(230, 215).lineTo(365, 215).lineWidth(1.5).strokeColor("#cbd5e1").stroke();
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#475569").text("Direct Service", 230, 222, { width: 135, align: "center" });

    // Destination City & Time
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#1e293b").text(ticket.destination, 410, 205);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#16a34a").text(`Arr: ${ticket.arrivalTime}`, 410, 226);
    doc.fontSize(8).font("Helvetica").fillColor("#64748b").text(`Date: ${ticket.departureDate}`, 410, 238);

    // 4. Passenger Details Table
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a").text("Passenger Details", 40, 270);

    // Table Header Row
    doc.rect(40, 286, 532, 22).fill("#f1f5f9");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#334155");
    doc.text("#", 55, 293);
    doc.text("Passenger Name", 90, 293);
    doc.text("Age", 280, 293);
    doc.text("Gender", 360, 293);
    doc.text("Seat Number", 460, 293);

    // Table Rows
    let yPos = 310;
    ticket.passengers.forEach((p, idx) => {
      doc.rect(40, yPos - 2, 532, 22).fill(idx % 2 === 0 ? "#ffffff" : "#f8fafc");
      doc.fontSize(9).font("Helvetica").fillColor("#1e293b");
      doc.text(String(idx + 1), 55, yPos);
      doc.font("Helvetica-Bold").text(p.name, 90, yPos);
      doc.font("Helvetica").text(String(p.age), 280, yPos);
      doc.text(p.gender, 360, yPos);
      doc.font("Helvetica-Bold").fillColor("#d84e55").text(p.seatNumber, 460, yPos);
      yPos += 24;
    });

    // Line Divider
    doc.moveTo(40, yPos + 5).lineTo(572, yPos + 5).lineWidth(0.5).strokeColor("#cbd5e1").stroke();

    // 5. Fare Breakup & Payment Summary Box
    yPos += 20;
    const totalDiscounts = parseFloat(ticket.discountAmount || 0) + parseFloat(ticket.walletAmountUsed || 0);
    const boxHeight = totalDiscounts > 0 ? 85 : 70;

    doc.roundedRect(40, yPos, 532, boxHeight, 6).fill("#f8fafc").stroke("#cbd5e1");

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a").text("Fare Breakdown & Payment Summary", 55, yPos + 10);
    
    doc.fontSize(9).font("Helvetica").fillColor("#475569");
    doc.text("Base Seat Fare:", 55, yPos + 28);
    doc.font("Helvetica-Bold").fillColor("#1e293b").text(`INR ${ticket.totalAmount}`, 190, yPos + 28);

    if (totalDiscounts > 0) {
      doc.font("Helvetica").fillColor("#475569").text("Discounts / Wallet:", 55, yPos + 44);
      doc.font("Helvetica-Bold").fillColor("#d84e55").text(`- INR ${totalDiscounts.toFixed(2)}`, 190, yPos + 44);
    }

    const totalY = yPos + (totalDiscounts > 0 ? 60 : 46);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#16a34a");
    doc.text("Total Amount Paid:", 55, totalY);
    doc.text(`INR ${ticket.finalAmountPaid}`, 190, totalY);

    // Official Verification Badge Box
    doc.roundedRect(380, yPos + 8, 175, boxHeight - 16, 6).fill("#ffffff").stroke("#cbd5e1");
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#64748b").text("OFFICIAL REDBUS VERIFIED", 390, yPos + 16, { width: 155, align: "center" });
    doc.fontSize(7).font("Helvetica").fillColor("#94a3b8").text("Valid with Govt Photo ID.", 390, yPos + 30, { width: 155, align: "center" });
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#d84e55").text(`PNR: ${ticket.pnr}`, 390, yPos + 44, { width: 155, align: "center" });

    // 6. Terms & Support Footer
    yPos += boxHeight + 25;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#334155").text("Important Terms & Helpline Support:", 40, yPos);
    doc.fontSize(8).font("Helvetica").fillColor("#64748b");
    doc.text("• Please carry a printout of this E-Ticket or show the M-Ticket SMS along with a valid Govt ID proof during boarding.", 40, yPos + 14);
    doc.text("• Arrival and departure times are subject to traffic conditions. Please report at the boarding point 15 mins prior.", 40, yPos + 26);
    doc.text("• 24x7 Customer Support Helpline: 1800-102-9999 | Email: support@redbus.in", 40, yPos + 38);

    // Bottom Red Footer Line
    doc.rect(0, 760, 612, 32).fill("#d84e55");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff").text("Wish you a safe & comfortable journey!  •  Thank you for booking with RedBus PRO", 0, 772, { width: 612, align: "center" });
  }

  /**
   * Generate PDF Ticket Stream for Download using PDFKit
   */
  async generateTicketPDF(pnr, res) {
    const ticket = await this.getTicketDetails(pnr);
    const doc = new PDFDocument({ size: "A4", margin: 0 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=RedBus-Ticket-${ticket.pnr}.pdf`);

    doc.pipe(res);
    this.buildProfessionalTicketPDF(ticket, doc);
    doc.end();
  }

  /**
   * Generate PDF Buffer for Email Attachments
   */
  async generateTicketPDFBuffer(pnr) {
    const ticket = await this.getTicketDetails(pnr);
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    this.buildProfessionalTicketPDF(ticket, doc);
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));
    });
  }

  /**
   * Cancel Ticket & Calculate Refund back to User Wallet
   */
  async cancelTicket(userId, pnr) {
    if (!pnr) {
      const error = new Error("PNR is required");
      error.statusCode = 400;
      throw error;
    }

    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const bookingRepo = transactionalEntityManager.getRepository(this.bookingModel.target || "Booking");
      const passengerRepo = transactionalEntityManager.getRepository(this.passengerModel.target || "Passenger");
      const seatRepo = transactionalEntityManager.getRepository(this.seatModel.target || "Seat");

      const booking = await bookingRepo.findOne({ where: { pnr, userId } });

      if (!booking) {
        const error = new Error("Booking record not found or does not belong to user.");
        error.statusCode = 404;
        throw error;
      }

      if (booking.bookingStatus === "CANCELLED") {
        const error = new Error("This ticket has already been cancelled.");
        error.statusCode = 400;
        throw error;
      }

      // Refund calculation: 80% refund (20% cancellation fee)
      const paidAmount = parseFloat(booking.finalAmountPaid);
      const refundAmount = (paidAmount * 0.80).toFixed(2);

      // Update booking status
      booking.bookingStatus = "CANCELLED";
      await bookingRepo.save(booking);

      // Free up booked seats
      const passengers = await passengerRepo.find({ where: { bookingId: booking.id } });
      for (const p of passengers) {
        const seat = await seatRepo.findOne({
          where: { tripId: booking.tripId, seatNumber: p.seatNumber },
        });
        if (seat) {
          seat.status = "AVAILABLE";
          await seatRepo.save(seat);
        }
      }

      // Process wallet refund inside the same DB transaction
      if (this.walletService && parseFloat(refundAmount) > 0) {
        const refundRefId = `REFUND-CANCEL-${booking.pnr}`;
        await this.walletService.addMoney(
          userId,
          parseFloat(refundAmount),
          refundRefId,
          transactionalEntityManager
        );
      }

      return {
        message: "Ticket cancelled successfully. 80% refund credited to your wallet balance.",
        pnr: booking.pnr,
        paidAmount: paidAmount.toFixed(2),
        refundAmount: refundAmount,
        cancellationFee: (paidAmount - parseFloat(refundAmount)).toFixed(2),
      };
    });
  }
}

export default TicketService;

