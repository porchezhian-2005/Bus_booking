import express from "express";
import { getSystemConfig, updateSystemConfig } from "../controller/configController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: View system configuration settings (wallet max %, referral reward)
 *     tags: [System Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current system settings returned
 *   put:
 *     summary: Admin update system configuration settings
 *     tags: [System Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletMaxUsagePercent: { type: number, example: 25 }
 *               referralAmount: { type: number, example: 750 }
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.get("/", authenticateJWT, getSystemConfig);
router.put("/", authenticateJWT, authorizeRoles("admin"), updateSystemConfig);

export default router;
