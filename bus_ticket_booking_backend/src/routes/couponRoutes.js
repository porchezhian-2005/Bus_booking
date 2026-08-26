import express from "express";
import { createCoupon, getActiveCoupons, validateCoupon } from "../controller/couponController.js";
import { authenticateJWT } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

// Public Routes
router.get("/", getActiveCoupons);
router.post("/validate", authenticateJWT, validateCoupon);

// Admin Routes
router.post("/", authenticateJWT, authorizeRoles("admin"), createCoupon);

export default router;
