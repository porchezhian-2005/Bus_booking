import AppDataSource from "../config/database.js";
import BookingEntity from "../models/Booking.js";
import PassengerEntity from "../models/Passenger.js";
import SeatEntity from "../models/Seat.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";

import TicketService from "../services/ticketService.js";
import WalletService from "../services/walletService.js";

const bookingRepository = AppDataSource.getRepository(BookingEntity);
const passengerRepository = AppDataSource.getRepository(PassengerEntity);
const seatRepository = AppDataSource.getRepository(SeatEntity);
const walletRepository = AppDataSource.getRepository(WalletEntity);
const transactionRepository = AppDataSource.getRepository(WalletTransactionEntity);

const walletService = new WalletService(walletRepository, transactionRepository);
const ticketService = new TicketService(bookingRepository, passengerRepository, seatRepository, walletService);

export const getTicketDetails = async (req, res) => {
  try {
    const ticket = await ticketService.getTicketDetails(req.params.pnr);
    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const downloadTicketPDF = async (req, res) => {
  try {
    await ticketService.generateTicketPDF(req.params.pnr, res);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const cancelTicket = async (req, res) => {
  try {
    const result = await ticketService.cancelTicket(req.user.id, req.body.pnr);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
