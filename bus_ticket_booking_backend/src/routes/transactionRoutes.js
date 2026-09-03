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
router.get("/my-transactions", authenticateJWT, authorizeRoles("user"), getUserTransactions);

/**
 * @swagger
 * /api/transactions/all:
 *   get:
 *     summary: Super Admin view all payment transactions & reports [Super Admin Authorized]
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all system transactions
 *       403:
 *         description: Forbidden (Super Admin role required)
 */
router.get("/all", authenticateJWT, authorizeRoles("SUPER_ADMIN"), getAllTransactions);

export default router;
