import express from "express";
import {
  addBus,
  updateBus,
  deleteBus,
  addRoute,
  createTrip,
  searchTrips,
  getTripSeats,
  getAdminAnalytics,
  getAllRoutes,
  getAllBuses,
  getAllTrips,
} from "../controller/busController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/buses/search:
 *   get:
 *     summary: Search bus trips with source, destination, date, filters, and sorting
 *     tags: [Buses & Search]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         example: "Chennai"
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *         example: "Bangalore"
 *       - in: query
 *         name: date
 *         schema: { type: string }
 *         example: "2026-09-01"
 *       - in: query
 *         name: busType
 *         schema: { type: string }
 *         example: "Sleeper"
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [price_asc, price_desc] }
 *         example: "price_asc"
 *     responses:
 *       200:
 *         description: Search results matching query parameters
 */
router.get("/search", searchTrips);

/**
 * @swagger
 * /api/buses/trips/{tripId}/seats:
 *   get:
 *     summary: View seat layout and availability status for a trip
 *     tags: [Buses & Search]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of seat availability, types (sleeper/seater), and prices
 */
router.get("/trips/:tripId/seats", getTripSeats);

/**
 * @swagger
 * /api/buses/analytics:
 *   get:
 *     summary: Admin view basic analytics (daily bookings, revenue)
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue and booking statistics
 */
router.get("/analytics", authenticateJWT, authorizeRoles("admin"), getAdminAnalytics);

router.get("/routes", authenticateJWT, authorizeRoles("admin"), getAllRoutes);
router.get("/all-buses", authenticateJWT, authorizeRoles("admin"), getAllBuses);
router.get("/all-trips", getAllTrips);

/**
 * @swagger
 * /api/buses:
 *   post:
 *     summary: Admin create a new bus
 *     tags: [Admin - Buses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, busNumber, busType, totalSeats, operatorName]
 *             properties:
 *               name: { type: string, example: "Volvo Multi-Axle" }
 *               busNumber: { type: string, example: "TN-01-AB-1234" }
 *               busType: { type: string, example: "AC Sleeper" }
 *               totalSeats: { type: number, example: 30 }
 *               operatorName: { type: string, example: "Express Travels" }
 *     responses:
 *       201:
 *         description: Bus created successfully
 */
router.post("/", authenticateJWT, authorizeRoles("admin"), addBus);

/**
 * @swagger
 * /api/buses/{id}:
 *   put:
 *     summary: Admin update bus details
 *     tags: [Admin - Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bus updated successfully
 *   delete:
 *     summary: Admin delete a bus
 *     tags: [Admin - Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bus deleted successfully
 */
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateBus);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteBus);

/**
 * @swagger
 * /api/buses/routes:
 *   post:
 *     summary: Admin create a new route
 *     tags: [Admin - Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source, destination, distanceKm, durationHours]
 *             properties:
 *               source: { type: string, example: "Chennai" }
 *               destination: { type: string, example: "Bangalore" }
 *               distanceKm: { type: number, example: 350 }
 *               durationHours: { type: number, example: 6.5 }
 *     responses:
 *       201:
 *         description: Route created successfully
 */
router.post("/routes", authenticateJWT, authorizeRoles("admin"), addRoute);

/**
 * @swagger
 * /api/buses/trips:
 *   post:
 *     summary: Admin schedule a trip and auto-generate seat layout
 *     tags: [Admin - Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [busId, routeId, departureDate, departureTime, arrivalTime, basePrice]
 *             properties:
 *               busId: { type: string }
 *               routeId: { type: string }
 *               departureDate: { type: string, example: "2026-09-01" }
 *               departureTime: { type: string, example: "10:00 PM" }
 *               arrivalTime: { type: string, example: "05:00 AM" }
 *               basePrice: { type: number, example: 850 }
 *     responses:
 *       201:
 *         description: Trip created and seats generated successfully
 */
router.post("/trips", authenticateJWT, authorizeRoles("admin"), createTrip);

export default router;
