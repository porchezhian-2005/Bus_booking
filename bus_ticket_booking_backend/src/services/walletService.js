/**
 * Wallet Service
 * Handles business logic for user wallet operations:
 * - Automatically create user wallet
 * - Get user wallet balance & transaction history
 * - Add money to wallet via payment gateway
 * - Calculate maximum usable wallet balance based on configurable percentage
 * - Deduct / Refund wallet balance
 */
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";

export class WalletService {
  constructor(walletModel, transactionModel) {
    this.walletModel = walletModel;
    this.transactionModel = transactionModel;
  }

  /**
   * Create wallet for user if it doesn't already exist
   */
  async createWallet(userId) {
    let wallet = await this.walletModel.findOne({ where: { userId } });
    if (!wallet) {
      const newWallet = this.walletModel.create({
        userId,
        balance: 0.00,
        currency: "INR",
      });
      wallet = await this.walletModel.save(newWallet);
    }
    return wallet;
  }

  /**
   * Get wallet details and balance for authenticated user
   */
  async getUserWallet(userId) {
    let wallet = await this.walletModel.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    return {
      walletId: wallet.id,
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
    };
  }

  /**
   * Add Money to User Wallet (Payment Gateway Integration sandbox)
   */
  async addMoney(userId, amount, paymentReferenceId, transactionalManager = null, source = "ADD_MONEY", description = null) {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      const error = new Error("Amount must be greater than 0");
      error.statusCode = 400;
      throw error;
    }

    const walletRepo = transactionalManager ? transactionalManager.getRepository(this.walletModel.target || "Wallet") : this.walletModel;
    const txnRepo = transactionalManager ? transactionalManager.getRepository(this.transactionModel.target || "WalletTransaction") : this.transactionModel;

    // Idempotency check: prevent duplicate processing of the same reference ID
    if (paymentReferenceId) {
      const existingTxn = await txnRepo.findOne({ where: { referenceId: paymentReferenceId, userId } });
      if (existingTxn) {
        const error = new Error("Duplicate wallet transaction detected for this reference ID");
        error.statusCode = 409;
        throw error;
      }
    }

    let wallet = await walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = walletRepo.create({
        userId,
        balance: 0.00,
        currency: "INR",
      });
      wallet = await walletRepo.save(wallet);
    }

    // Credit wallet balance
    const currentBalance = parseFloat(wallet.balance || 0);
    const newBalance = currentBalance + numAmount;
    wallet.balance = newBalance.toFixed(2);
    await walletRepo.save(wallet);

    // Record wallet transaction entry
    const transaction = txnRepo.create({
      walletId: wallet.id,
      userId,
      amount: numAmount.toFixed(2),
      type: "CREDIT",
      source: source || "ADD_MONEY",
      description: description || `Added ₹${numAmount.toFixed(2)} to wallet`,
      referenceId: paymentReferenceId || `PAY-${Date.now()}`,
    });
    await txnRepo.save(transaction);

    return {
      message: "Money added to wallet successfully",
      newBalance: parseFloat(wallet.balance),
    };
  }

  /**
   * Debit Money from User Wallet
   */
  async debitMoney(userId, amount, source = "BOOKING_PAYMENT", description = "", referenceId = null, transactionalManager = null) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      const error = new Error("Debit amount must be greater than 0");
      error.statusCode = 400;
      throw error;
    }

    const walletRepo = transactionalManager ? transactionalManager.getRepository(this.walletModel?.target || WalletEntity) : this.walletModel;
    const txnRepo = transactionalManager ? transactionalManager.getRepository(this.transactionModel?.target || WalletTransactionEntity) : this.transactionModel;

    // Idempotency check
    if (referenceId) {
      const existingTxn = await txnRepo.findOne({ where: { referenceId, userId, type: "DEBIT" } });
      if (existingTxn) {
        const error = new Error("Duplicate wallet debit detected for this reference ID");
        error.statusCode = 409;
        throw error;
      }
    }

    let wallet = await walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      const error = new Error("User wallet not found");
      error.statusCode = 404;
      throw error;
    }

    const currentBalance = parseFloat(wallet.balance || 0);
    if (currentBalance < numAmount) {
      const error = new Error(`Insufficient wallet balance. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${numAmount.toFixed(2)}`);
      error.statusCode = 400;
      throw error;
    }

    const newBalance = currentBalance - numAmount;
    wallet.balance = newBalance.toFixed(2);
    await walletRepo.save(wallet);

    const transaction = txnRepo.create({
      walletId: wallet.id,
      userId,
      amount: numAmount.toFixed(2),
      type: "DEBIT",
      source: source || "BOOKING_PAYMENT",
      description: description || `Debited ₹${numAmount.toFixed(2)} for payment`,
      referenceId: referenceId || `DEBIT-${Date.now()}`,
    });
    await txnRepo.save(transaction);

    return {
      message: "Wallet debited successfully",
      newBalance: parseFloat(wallet.balance),
      amountDebited: numAmount,
    };
  }

  /**
   * Get Wallet Transaction History for user
   */
  async getTransactionHistory(userId) {
    const transactions = await this.transactionModel.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    return transactions.map((t) => {
      const isRefund = t.source === "REFUND" || 
        (t.referenceId && String(t.referenceId).startsWith("REFUND-")) ||
        (t.description && String(t.description).toLowerCase().includes("refund"));

      let effectiveSource = t.source;
      let effectiveDescription = t.description;

      if (t.type === "CREDIT") {
        if (isRefund) {
          effectiveSource = "REFUND";
          effectiveDescription = t.description || `Refund of ₹${parseFloat(t.amount).toFixed(2)} credited to wallet`;
        } else {
          // All non-refund wallet credits in the system are Referral Rewards
          effectiveSource = "REFERRAL_REWARD";
          effectiveDescription = `Referral Bonus: ₹${parseFloat(t.amount).toFixed(0)} credited to wallet`;
        }
      } else if (t.type === "DEBIT" || t.source === "BOOKING_PAYMENT") {
        effectiveSource = "BOOKING_PAYMENT";
        effectiveDescription = t.description || `Payment for Bus Booking`;
      }

      return {
        id: t.id,
        amount: parseFloat(t.amount),
        type: t.type,
        source: effectiveSource,
        description: effectiveDescription,
        referenceId: t.referenceId,
        createdAt: t.createdAt,
      };
    });
  }
}

export default WalletService;

