import express from "express";
import {
  createRazorpayBookingOrder,
  cancelRazorpayHold,
  handleRazorpayWebhook,
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
router.post("/razorpay/cancel-hold", authenticateJWT, cancelRazorpayHold);
router.post("/razorpay/webhook", handleRazorpayWebhook);

/**
 * @swagger
 * /api/payments/razorpay/add-wallet-money:
 *   post:
 *     summary: Add money to user wallet via Razorpay (TEST Mode)
 *     description: Verifies Razorpay TEST payment HMAC signature and credits user wallet balance inside an atomic DB transaction.
 *     tags: [Razorpay Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               amount: { type: number, example: 1000 }
 *               razorpay_order_id: { type: string, example: "order_123456789" }
 *               razorpay_payment_id: { type: string, example: "pay_987654321" }
 *               razorpay_signature: { type: string, example: "hmac_sha256_signature_hex" }
 *     responses:
 *       200:
 *         description: Money added to wallet via Razorpay TEST mode successfully
 *       400:
 *         description: Invalid Razorpay TEST payment signature or amount <= 0
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/razorpay/add-wallet-money", authenticateJWT, addMoneyToWalletViaRazorpay);

export default router;
