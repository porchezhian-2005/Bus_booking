/**
 * Transaction Service
 * Handles recording and listing payment transactions & financial reports
 */
export class TransactionService {
  constructor(transactionModel) {
    this.transactionModel = transactionModel;
  }

  /**
   * Record a payment transaction
   */
  async createTransaction(data) {
    const txn = this.transactionModel.create({
      transactionId: `TXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
      userId: data.userId,
      bookingId: data.bookingId || null,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus || "SUCCESS",
      gatewayReferenceId: data.gatewayReferenceId || `GATEWAY-${Date.now()}`,
    });

    return await this.transactionModel.save(txn);
  }

  /**
   * Get user transaction history
   */
  async getUserTransactions(userId) {
    return await this.transactionModel.find({
      where: { userId },
      relations: { booking: true },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get all transactions for Admin reports
   */
  async getAllTransactions() {
    return await this.transactionModel.find({
      relations: { user: true, booking: true },
      order: { createdAt: "DESC" },
    });
  }
}

export default TransactionService;
