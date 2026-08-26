import express from "express";
import { getUserTransactions, getAllTransactions } from "../controller/transactionController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/transactions/my-transactions:
 *   get:
 *     summary: View user payment transaction history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment transactions
 */
router.get("/my-transactions", authenticateJWT, getUserTransactions);

/**
 * @swagger
 * /api/transactions/all:
 *   get:
 *     summary: Admin view all payment transactions & reports
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all system transactions
 */
router.get("/all", authenticateJWT, authorizeRoles("admin"), getAllTransactions);

export default router;
