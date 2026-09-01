import express from "express";
import { getSystemConfig, updateSystemConfig } from "../controller/configController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: View system configuration settings [Admin Authorized]
 *     description: Retrieve global system configuration settings (wallet max usage % and referral reward amount).
 *     tags: [Admin - Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current system configuration settings returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/SystemConfig' }
 *       403:
 *         description: Forbidden (Admin role required)
 *   put:
 *     summary: Admin update system configuration settings [Admin Authorized]
 *     description: Update global system configuration settings (wallet max usage % and referral reward amount).
 *     tags: [Admin - Configuration]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/SystemConfig' }
 *       403:
 *         description: Forbidden (Admin role required)
 */
import Joi from "joi";

export const updateConfigSchema = Joi.object({
  walletMaxUsagePercent: Joi.number().min(0).max(100).optional().messages({
    "number.min": "Wallet max usage percent cannot be negative.",
    "number.max": "Wallet max usage percent cannot exceed 100%.",
  }),
  referralAmount: Joi.number().min(0).optional().messages({
    "number.min": "Referral amount cannot be negative.",
  }),
}).min(1);

export const validateUpdateConfig = (req, res, next) => {
  const result = updateConfigSchema.validate(req.body);
  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error.details[0].message,
    });
  }
  req.body = result.value;
  next();
};

router.get("/", authenticateJWT, authorizeRoles("admin"), getSystemConfig);
router.put("/", authenticateJWT, authorizeRoles("admin"), validateUpdateConfig, updateSystemConfig);


export default router;
