import express from "express";
import { getMyReferralStats, getAllReferralRecords } from "../controller/referralController.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// User Referral Stats Route
router.get("/my-stats", authenticateJWT, getMyReferralStats);

// Admin: View all referral records
router.get("/all", authenticateJWT, getAllReferralRecords);

export default router;
