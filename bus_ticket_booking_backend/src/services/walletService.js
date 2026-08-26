/**
 * Wallet Service
 * Handles business logic for user wallet operations:
 * - Automatically create user wallet
 * - Get user wallet balance & transaction history
 * - Add money to wallet via payment gateway
 * - Calculate maximum usable wallet balance based on configurable percentage
 * - Deduct / Refund wallet balance
 */
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
  async addMoney(userId, amount, paymentReferenceId) {
    if (!amount || amount <= 0) {
      const error = new Error("Amount must be greater than 0");
      error.statusCode = 400;
      throw error;
    }

    let wallet = await this.walletModel.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    // Credit wallet balance
    const currentBalance = parseFloat(wallet.balance);
    const newBalance = currentBalance + parseFloat(amount);
    wallet.balance = newBalance;
    await this.walletModel.save(wallet);

    // Record wallet transaction entry
    const transaction = this.transactionModel.create({
      walletId: wallet.id,
      userId,
      amount,
      type: "CREDIT",
      source: "ADD_MONEY",
      description: `Added ₹${amount} to wallet via Payment Gateway`,
      referenceId: paymentReferenceId || `PAY-${Date.now()}`,
    });
    await this.transactionModel.save(transaction);

    return {
      message: "Money added to wallet successfully",
      newBalance: parseFloat(wallet.balance),
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

    return transactions.map((t) => ({
      id: t.id,
      amount: parseFloat(t.amount),
      type: t.type,
      source: t.source,
      description: t.description,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    }));
  }
}

export default WalletService;
