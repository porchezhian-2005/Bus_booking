import express from "express";
import { createBooking, getUserBookings, getAllBookings } from "../controller/bookingController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Reserve seats and create a new bus booking
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
 *               tripId: { type: string }
 *               seatIds: { type: array, items: { type: string } }
 *               useWallet: { type: boolean, example: true }
 *               couponCode: { type: string }
 *               passengers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string, example: "John Passenger" }
 *                     age: { type: number, example: 28 }
 *                     gender: { type: string, example: "Male" }
 *     responses:
 *       201:
 *         description: Booking confirmed successfully with PNR
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
 *         description: List of user bookings
 */
router.get("/my-bookings", authenticateJWT, getUserBookings);

// Admin Routes
router.get("/all", authenticateJWT, authorizeRoles("admin"), getAllBookings);

export default router;
