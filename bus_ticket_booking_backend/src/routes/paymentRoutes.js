import express from "express";
import {
  createRazorpayBookingOrder,
  verifyRazorpayPayment,
  addMoneyToWalletViaRazorpay,
} from "../controller/paymentController.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/payments/razorpay/create-order:
 *   post:
 *     summary: Create a Razorpay payment order
 *     tags: [Razorpay Payments]
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
 *         description: Order created with orderId and key
 */
router.post("/razorpay/create-order", authenticateJWT, createRazorpayBookingOrder);

/**
 * @swagger
 * /api/payments/razorpay/verify:
 *   post:
 *     summary: Verify Razorpay payment signature & confirm transaction
 *     tags: [Razorpay Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id: { type: string }
 *               razorpay_payment_id: { type: string }
 *               razorpay_signature: { type: string }
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.post("/razorpay/verify", authenticateJWT, verifyRazorpayPayment);

/**
 * @swagger
 * /api/payments/razorpay/add-wallet-money:
 *   post:
 *     summary: Add money to user wallet via Razorpay
 *     tags: [Razorpay Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, razorpay_payment_id]
 *             properties:
 *               amount: { type: number, example: 1000 }
 *               razorpay_payment_id: { type: string, example: "pay_293847293" }
 *     responses:
 *       200:
 *         description: Money added to wallet via Razorpay
 */
router.post("/razorpay/add-wallet-money", authenticateJWT, addMoneyToWalletViaRazorpay);

export default router;
