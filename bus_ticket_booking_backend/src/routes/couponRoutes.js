import express from "express";
import { createCoupon, updateCoupon, deleteCoupon, getActiveCoupons, validateCoupon } from "../controller/couponController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: View all active coupons available to users
 *     tags: [Coupons]
 *     responses:
 *       200:
 *         description: List of active coupons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Coupon' }
 *   post:
 *     summary: Admin create a new discount coupon [Admin Authorized]
 *     tags: [Admin - Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountType, discountValue, minBookingAmount, expiryDate]
 *             properties:
 *               code: { type: string, example: "SAVE10" }
 *               discountType: { type: string, enum: [PERCENT, FIXED], example: "PERCENT" }
 *               discountValue: { type: number, example: 10 }
 *               minBookingAmount: { type: number, example: 500 }
 *               expiryDate: { type: string, example: "2028-12-31" }
 *               maxUsagePerUser: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get("/", getActiveCoupons);

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate coupon code & calculate discount amount
 *     description: Validates coupon active status, expiry, minimum booking amount, and enforces per-user usage limits. Enforces mutual exclusion with wallet payment.
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, bookingAmount]
 *             properties:
 *               code: { type: string, example: "SAVE10" }
 *               bookingAmount: { type: number, example: 1000 }
 *               useWallet: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Coupon valid; discount amount calculated
 *       400:
 *         description: Invalid or expired coupon, minimum amount not met, user usage limit reached, or wallet mutual exclusion violation
 */
router.post("/validate", authenticateJWT, validateCoupon);

// Super Admin Routes
router.post("/", authenticateJWT, authorizeRoles("SUPER_ADMIN"), createCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Super Admin update existing coupon details [Super Admin Authorized]
 *     tags: [Admin - Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Coupon' }
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       404:
 *         description: Coupon not found
 *   delete:
 *     summary: Super Admin delete a coupon [Super Admin Authorized]
 *     tags: [Admin - Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 */
router.put("/:id", authenticateJWT, authorizeRoles("SUPER_ADMIN"), updateCoupon);
router.delete("/:id", authenticateJWT, authorizeRoles("SUPER_ADMIN"), deleteCoupon);

export default router;


