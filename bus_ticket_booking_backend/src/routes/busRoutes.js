import express from "express";
import {
  addBus,
  updateBus,
  deleteBus,
  decommissionBus,
  addRoute,
  updateRouteStops,
  createTrip,
  updateTrip,

  searchTrips,
  getTripSeats,
  getAdminAnalytics,
  getAllRoutes,
  getAllBuses,
  getAllTrips,
  addRoutePoint,
  getRoutePoints,
  updateRoutePoint,
  deleteRoutePoint,
  getTripPoints,
} from "../controller/busController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";
import {
  validateUpdateBus,
  validateDecommissionBus,
  validateAddBus,
  validateAddRoute,
  validateCreateRoutePoint,
  validateUpdateRoutePoint,
} from "../validation/busValidation.js";
import { validateUpdateTrip, validateCreateTrip } from "../validation/tripValidation.js";

const router = express.Router();

/**
 * @swagger
 * /api/buses/search:
 *   get:
 *     summary: Search bus trips with source, destination, date, filters, and sorting
 *     description: Search available bus trips with advanced filters (busType, minPrice, maxPrice, operator, departureTimeWindow) and sorting (price_asc, price_desc, duration_asc, duration_desc, EARLIEST).
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
 *         schema: { type: string, enum: [ALL, AC, SLEEPER, SEATER] }
 *         example: "AC"
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *         example: 500
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *         example: 1500
 *       - in: query
 *         name: operator
 *         schema: { type: string }
 *         example: "Express Travels"
 *       - in: query
 *         name: departureTimeWindow
 *         schema: { type: string, enum: [MORNING, AFTERNOON, EVENING, NIGHT] }
 *         example: "MORNING"
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [price_asc, price_desc, duration_asc, duration_desc, EARLIEST] }
 *         example: "price_asc"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 8 }
 *     responses:
 *       200:
 *         description: Search results matching query parameters with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Trip' }
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
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
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of seat availability, types (sleeper/seater), and prices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Seat' }
 */
router.get("/trips/:tripId/seats", getTripSeats);

/**
 * @swagger
 * /api/buses/analytics:
 *   get:
 *     summary: Admin view analytics (daily bookings, total & payment method revenue) [Admin Authorized]
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue and booking statistics returned
 *       401:
 *         description: Unauthorized (Invalid or missing JWT token)
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get("/analytics", authenticateJWT, authorizeRoles("SUPER_ADMIN"), getAdminAnalytics);

/**
 * @swagger
 * /api/buses/routes:
 *   get:
 *     summary: Admin get all routes [Admin Authorized]
 *     tags: [Admin - Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all routes
 */
router.get("/routes", authenticateJWT, authorizeRoles("admin"), getAllRoutes);

/**
 * @swagger
 * /api/buses/all-buses:
 *   get:
 *     summary: Admin get all buses [Admin Authorized]
 *     tags: [Admin - Buses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all buses
 */
router.get("/all-buses", authenticateJWT, authorizeRoles("admin"), getAllBuses);

/**
 * @swagger
 * /api/buses/all-trips:
 *   get:
 *     summary: Get all scheduled trips
 *     tags: [Buses & Search]
 *     responses:
 *       200:
 *         description: List of all trips
 */
router.get("/all-trips", getAllTrips);

/**
 * @swagger
 * /api/buses:
 *   post:
 *     summary: Admin create a new bus [Admin Authorized]
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
 *               name: { type: string, example: "Volvo Multi-Axle AC" }
 *               busNumber: { type: string, example: "TN-01-AB-1234" }
 *               busType: { type: string, example: "AC Sleeper" }
 *               totalSeats: { type: integer, example: 30 }
 *               operatorName: { type: string, example: "Express Travels" }
 *     responses:
 *       201:
 *         description: Bus created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Bus' }
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.post("/", authenticateJWT, authorizeRoles("admin"), validateAddBus, addBus);

/**
 * @swagger
 * /api/buses/{id}:
 *   put:
 *     summary: Admin update bus details [Admin Authorized]
 *     tags: [Admin - Buses]
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
 *           schema: { $ref: '#/components/schemas/Bus' }
 *     responses:
 *       200:
 *         description: Bus updated successfully
 *   delete:
 *     summary: Admin delete a bus [Admin Authorized]
 *     tags: [Admin - Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bus deleted successfully
 */
router.put("/:id", authenticateJWT, authorizeRoles("admin"), validateUpdateBus, updateBus);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteBus);
router.post("/:id/decommission", authenticateJWT, authorizeRoles("admin"), validateDecommissionBus, decommissionBus);

/**
 * @swagger
 * /api/buses/routes:
 *   post:
 *     summary: Admin create a new route [Admin Authorized]
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
 *               stops: { type: array, items: { type: string }, example: ["Vellore", "Hosur"] }
 *     responses:
 *       201:
 *         description: Route created successfully
 */
router.post("/routes", authenticateJWT, authorizeRoles("admin"), validateAddRoute, addRoute);

/**
 * @swagger
 * /api/buses/routes/{id}/stops:
 *   put:
 *     summary: Admin update intermediate stops for a route [Admin Authorized]
 *     tags: [Admin - Routes]
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
 *           schema:
 *             type: object
 *             required: [stops]
 *             properties:
 *               stops:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Vellore", "Ambur", "Hosur"]
 *     responses:
 *       200:
 *         description: Route stops updated successfully
 *       404:
 *         description: Route not found
 */
router.put("/routes/:id/stops", authenticateJWT, authorizeRoles("admin"), updateRouteStops);

/**
 * @swagger
 * /api/buses/trips:
 *   post:
 *     summary: Admin schedule a trip and auto-generate seat layout [Admin Authorized]
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
 *               busId: { type: string, format: uuid }
 *               routeId: { type: string, format: uuid }
 *               departureDate: { type: string, example: "2026-09-01" }
 *               departureTime: { type: string, example: "10:00 PM" }
 *               arrivalTime: { type: string, example: "05:00 AM" }
 *               basePrice: { type: number, example: 850 }
 *     responses:
 *       201:
 *         description: Trip created and seats generated successfully
 */
router.post("/trips", authenticateJWT, authorizeRoles("admin"), validateCreateTrip, createTrip);
router.put("/trips/:id", authenticateJWT, authorizeRoles("admin"), validateUpdateTrip, updateTrip);

// Route Point Management Endpoints (Admin & Public)
router.post("/routes/:routeId/points", authenticateJWT, authorizeRoles("admin"), validateCreateRoutePoint, addRoutePoint);
router.get("/routes/:routeId/points", getRoutePoints);
router.put("/routes/points/:pointId", authenticateJWT, authorizeRoles("admin"), validateUpdateRoutePoint, updateRoutePoint);
router.delete("/routes/points/:pointId", authenticateJWT, authorizeRoles("admin"), deleteRoutePoint);

// Trip Points Endpoint (Public for Seat Map Modal)
router.get("/trips/:tripId/points", getTripPoints);

export default router;
