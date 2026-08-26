import AppDataSource from "../config/database.js";
import TransactionEntity from "../models/Transaction.js";
import TransactionService from "../services/transactionService.js";

const transactionRepository = AppDataSource.getRepository(TransactionEntity);
const transactionService = new TransactionService(transactionRepository);

export const getUserTransactions = async (req, res) => {
  try {
    const txns = await transactionService.getUserTransactions(req.user.id);
    return res.status(200).json({ success: true, data: txns });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const txns = await transactionService.getAllTransactions();
    return res.status(200).json({ success: true, data: txns });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
