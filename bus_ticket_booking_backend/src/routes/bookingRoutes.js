import express from "express";
import { createBooking, getUserBookings, getAllBookings } from "../controller/bookingController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Reserve seats and create a new bus booking (Supports Wallet / Razorpay TEST Payment)
 *     description: Creates a new bus booking inside an atomic DB transaction with pessimistic write locking on seats. Accepts Razorpay TEST payment details if remaining cost > 0.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, seatIds, passengers]
 *             properties:
 *               tripId: { type: string, format: uuid }
 *               seatIds: { type: array, items: { type: string }, example: ["uuid-seat-1"] }
 *               useWallet: { type: boolean, example: false }
 *               couponCode: { type: string, example: "SAVE10" }
 *               razorpay_order_id: { type: string, example: "order_987654321" }
 *               razorpay_payment_id: { type: string, example: "pay_123456789" }
 *               razorpay_signature: { type: string, example: "hmac_sha256_signature_hex" }
 *               passengers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Passenger'
 *     responses:
 *       201:
 *         description: Booking confirmed successfully with PNR
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Bus ticket booked successfully!" }
 *                 data: { $ref: '#/components/schemas/Booking' }
 *       400:
 *         description: Bad Request (Invalid seat, double booking attempt, insufficient wallet balance, or invalid Razorpay signature)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized (Invalid or missing JWT token)
 */
router.post("/", authenticateJWT, createBooking);

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     summary: Get user booking history
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of authenticated user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Booking' }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User role required)
 */
router.get("/my-bookings", authenticateJWT, authorizeRoles("user"), getUserBookings);

/**
 * @swagger
 * /api/bookings/all:
 *   get:
 *     summary: Admin view all bookings with filters [Admin / Super Admin Authorized]
 *     tags: [Admin - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [CONFIRMED, CANCELLED] }
 *         example: "CONFIRMED"
 *       - in: query
 *         name: paymentMethod
 *         schema: { type: string, enum: [GATEWAY, WALLET, MIXED] }
 *         example: "GATEWAY"
 *       - in: query
 *         name: date
 *         schema: { type: string }
 *         example: "2026-09-01"
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         example: "Chennai"
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *         example: "Bangalore"
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         example: "PNR123"
 *     responses:
 *       200:
 *         description: Filtered list of all system bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Booking' }
 *       403:
 *         description: Forbidden (Admin or Super Admin role required)
 */
router.get("/all", authenticateJWT, authorizeRoles("admin", "SUPER_ADMIN"), getAllBookings);

export default router;
