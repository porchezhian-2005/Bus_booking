import AppDataSource from "../config/database.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import WalletService from "../services/walletService.js";

const walletRepository = AppDataSource.getRepository(WalletEntity);
const transactionRepository = AppDataSource.getRepository(WalletTransactionEntity);

const walletService = new WalletService(walletRepository, transactionRepository);

/**
 * Get User Wallet Balance
 */
export const getWallet = async (req, res) => {
  try {
    const walletData = await walletService.getUserWallet(req.user.id);
    return res.status(200).json({
      success: true,
      data: walletData,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch wallet details",
    });
  }
};

/**
 * Add Money to Wallet
 */
export const addMoney = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Manual topup is disabled. Wallet funds are earned exclusively through Referral Rewards and Ticket Cancellation Refunds.",
  });
};

/**
 * Get Wallet Transaction History
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await walletService.getTransactionHistory(req.user.id);
    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch transaction history",
    });
  }
};
