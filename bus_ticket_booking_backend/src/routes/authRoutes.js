import express from "express";
import {
  register,
  verifyEmailOtp,
  resendVerificationOtp,
  login,
  adminLogin,
  refreshToken,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
  logout,
} from "../controller/authController.js";
import { authenticateJWT } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Production Security: Rate Limiting to prevent brute-force attacks on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@example.com" }
 *               phone: { type: string, example: "9876543210" }
 *               password: { type: string, example: "Password123" }
 *               referralCode: { type: string, example: "USER6105" }
 *     responses:
 *       201:
 *         description: User registered successfully. OTP sent to email.
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify email OTP code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, example: "john@example.com" }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post("/verify-otp", verifyEmailOtp);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP code to email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "john@example.com" }
 *     responses:
 *       200:
 *         description: OTP resent successfully
 */
router.post("/resend-otp", resendVerificationOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User Login
 *     description: Authenticate normal users to obtain JWT Access Token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "john@example.com" }
 *               password: { type: string, example: "Password123" }
 *     responses:
 *       200:
 *         description: User login successful with JWT tokens
 */
router.post("/login", authLimiter, login);

/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     summary: Admin Login
 *     description: Dedicated authentication endpoint for Super Admin users.
 *     tags: [Admin - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "admin@busticket.com" }
 *               password: { type: string, example: "Admin@123456" }
 *     responses:
 *       200:
 *         description: Admin login successful with JWT tokens
 */
router.post("/admin/login", authLimiter, adminLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (invalidates JWT token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *   get:
 *     summary: Logout user via GET link
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authenticateJWT, logout);
router.get("/logout", authenticateJWT, logout);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT Access Token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New Access and Refresh tokens generated
 */
router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "john@example.com" }
 *     responses:
 *       200:
 *         description: Reset OTP sent to email
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Complete password reset with OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string, example: "john@example.com" }
 *               otp: { type: string, example: "123456" }
 *               newPassword: { type: string, example: "NewPassword123" }
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get authenticated user profile details
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details returned
 *   put:
 *     summary: Update personal profile details
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "John Updated" }
 *               phone: { type: string, example: "9876543210" }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.get("/profile", authenticateJWT, getProfile);
router.put("/profile", authenticateJWT, updateProfile);

router.post("/request-email-change", authenticateJWT, requestEmailChange);
router.post("/verify-email-change", authenticateJWT, verifyEmailChange);

export default router;
