import express from "express";
import { getWallet, addMoney, getTransactionHistory } from "../controller/walletController.js";
import { authenticateJWT } from "../middleware/auth.js";

import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: View user wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User wallet details & balance
 */
router.get("/", authenticateJWT, authorizeRoles("user"), getWallet);
router.get("/balance", authenticateJWT, authorizeRoles("user"), getWallet);

/**
 * @swagger
 * /api/wallet/add-money:
 *   post:
 *     summary: Add money to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 500 }
 *     responses:
 *       200:
 *         description: Money added to wallet successfully
 */
router.post("/add-money", authenticateJWT, authorizeRoles("user"), addMoney);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction ledger history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of wallet transaction logs
 */
router.get("/transactions", authenticateJWT, authorizeRoles("user"), getTransactionHistory);

export default router;
