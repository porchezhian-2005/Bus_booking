import express from "express";
import { getTicketDetails, downloadTicketPDF, cancelTicket } from "../controller/ticketController.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/tickets/{pnr}:
 *   get:
 *     summary: View ticket details by PNR
 *     tags: [Ticket Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pnr
 *         required: true
 *         schema: { type: string }
 *         example: "PNR12345678"
 *     responses:
 *       200:
 *         description: Ticket details returned
 */
router.get("/:pnr", authenticateJWT, getTicketDetails);

/**
 * @swagger
 * /api/tickets/{pnr}/pdf:
 *   get:
 *     summary: Download formatted PDF E-Ticket stream
 *     tags: [Ticket Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pnr
 *         required: true
 *         schema: { type: string }
 *         example: "PNR12345678"
 *     responses:
 *       200:
 *         description: PDF file stream download
 */
router.get("/:pnr/pdf", authenticateJWT, downloadTicketPDF);

/**
 * @swagger
 * /api/tickets/cancel:
 *   post:
 *     summary: Cancel ticket & process 80% refund to user wallet
 *     tags: [Ticket Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pnr]
 *             properties:
 *               pnr: { type: string, example: "PNR12345678" }
 *     responses:
 *       200:
 *         description: Ticket cancelled and refund credited to wallet
 */
router.post("/cancel", authenticateJWT, cancelTicket);

export default router;
