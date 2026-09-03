import express from "express";
import { getMyReferralStats, getAllReferralRecords } from "../controller/referralController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/referrals/my-stats:
 *   get:
 *     summary: View user referral statistics & referred users list
 *     description: Returns authenticated user's unique referral code, total referrals, successful referrals count, total earned rewards, and referred user list.
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral statistics and referee user list returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     referralCode: { type: string, example: "USER6105" }
 *                     totalReferrals: { type: integer, example: 5 }
 *                     successfulReferrals: { type: integer, example: 2 }
 *                     totalEarnedRewards: { type: number, example: 1000 }
 *                     referredUsers:
 *                       type: array
 *                       items: { type: object }
 *       401:
 *         description: Unauthorized
 */
router.get("/my-stats", authenticateJWT, authorizeRoles("user"), getMyReferralStats);

/**
 * @swagger
 * /api/referrals/all:
 *   get:
 *     summary: Super Admin view all referral records [Super Admin Authorized]
 *     tags: [Admin - Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all referral activity records
 *       403:
 *         description: Forbidden (Super Admin role required)
 */
router.get("/all", authenticateJWT, authorizeRoles("SUPER_ADMIN"), getAllReferralRecords);

export default router;


