import AppDataSource from "../config/database.js";
import UserEntity from "../models/User.js";
import ReferralEntity from "../models/Referral.js";
import SystemConfigEntity from "../models/SystemConfig.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import ReferralService from "../services/referralService.js";
import WalletService from "../services/walletService.js";
import EmailService from "../services/emailService.js";

const userRepository = AppDataSource.getRepository(UserEntity);
const referralRepository = AppDataSource.getRepository(ReferralEntity);
const configRepository = AppDataSource.getRepository(SystemConfigEntity);
const walletRepository = AppDataSource.getRepository(WalletEntity);
const transactionRepository = AppDataSource.getRepository(WalletTransactionEntity);

const emailService = new EmailService();
const walletService = new WalletService(walletRepository, transactionRepository);

const referralService = new ReferralService(
  userRepository,
  referralRepository,
  walletService,
  configRepository,
  emailService
);

/**
 * Get Authenticated User Referral Stats & Referred List
 */
export const getMyReferralStats = async (req, res) => {
  try {
    const stats = await referralService.getUserReferralStats(req.user.id);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch referral statistics",
    });
  }
};

/**
 * Admin API: View All Referral Records
 */
export const getAllReferralRecords = async (req, res) => {
  try {
    const records = await referralService.getAllReferrals();
    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch all referral records",
    });
  }
};
