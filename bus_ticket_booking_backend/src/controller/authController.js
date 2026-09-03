import passport from "passport";
import jwt from "jsonwebtoken";
import AppDataSource from "../config/database.js";
import UserEntity from "../models/User.js";
import UserService from "../services/userService.js";
import EmailService from "../services/emailService.js";
import { generateTokens, blacklistToken } from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validation/authValidation.js";

import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import WalletService from "../services/walletService.js";

import ReferralEntity from "../models/Referral.js";
import SystemConfigEntity from "../models/SystemConfig.js";
import ReferralService from "../services/referralService.js";

const userRepository = AppDataSource.getRepository(UserEntity);
const walletRepository = AppDataSource.getRepository(WalletEntity);
const transactionRepository = AppDataSource.getRepository(WalletTransactionEntity);
const referralRepository = AppDataSource.getRepository(ReferralEntity);
const configRepository = AppDataSource.getRepository(SystemConfigEntity);

const emailService = new EmailService();
const walletService = new WalletService(walletRepository, transactionRepository);
const referralService = new ReferralService(
  userRepository,
  referralRepository,
  walletService,
  configRepository,
  emailService
);

const userService = new UserService(
  userRepository,
  walletService,
  referralService,
  emailService
);

/**
 * Register User
 */
export const register = async (req, res) => {
  try {
    if (req.body && req.body.phone) {
      req.body.phone = String(req.body.phone).replace(/\D/g, "").slice(-10);
    }
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const userData = await userService.registerUser(value);
    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for the 6-digit OTP code to verify your account.",
      data: userData,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error during registration",
    });
  }
};

/**
 * Verify Email OTP
 */
export const verifyEmailOtp = async (req, res) => {
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await userService.verifyEmailOtp(value.email, value.otp);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "OTP verification failed",
    });
  }
};

/**
 * Resend Verification OTP
 */
export const resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const result = await userService.sendEmailOtp(email, "VERIFICATION");
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to resend OTP",
    });
  }
};

/**
 * Login User (PassportJS + JWT Access & Refresh Tokens)
 */
export const login = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  passport.authenticate("local", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Authentication error" });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: info?.message || "Invalid credentials" });
    }

    try {
      const { accessToken, refreshToken } = await userService.loginUser(user);

      return res.status(200).json({
        success: true,
        message: "User login successful",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            referralCode: user.referralCode,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (loginErr) {
      return res.status(500).json({ success: false, message: "Login failed" });
    }
  })(req, res, next);
};

/**
 * Dedicated Admin Login
 */
export const adminLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  passport.authenticate("local", { session: false }, async (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Authentication error" });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: info?.message || "Invalid admin credentials" });
    }

    const userRole = String(user.role || "").toUpperCase();
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Access denied. Only Admin and Super Admin users can log in via this endpoint." });
    }

    try {
      const { accessToken, refreshToken } = await userService.loginUser(user);

      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (loginErr) {
      return res.status(500).json({ success: false, message: "Admin login failed" });
    }
  })(req, res, next);
};

/**
 * Refresh Access Token
 */
export const refreshToken = async (req, res) => {
  try {
    const tokens = await userService.refreshToken(req.body.refreshToken);
    return res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to refresh token",
    });
  }
};

/**
 * Initiate Password Reset (Forgot Password)
 */
export const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await userService.initiatePasswordReset(value.email);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to initiate password reset",
    });
  }
};

/**
 * Reset Password with OTP
 */
export const resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await userService.resetPasswordWithOtp(value.email, value.otp, value.newPassword);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Password reset failed",
    });
  }
};

/**
 * Get Authenticated User Profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch profile",
    });
  }
};

/**
 * Update Profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const updatedProfile = await userService.updateUserProfile(req.user.id, value);
    return res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedProfile });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

/**
 * Request OTP for Email Address Change
 */
export const requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) {
      return res.status(400).json({ success: false, message: "New email address is required" });
    }
    const result = await userService.requestEmailChangeOtp(req.user.id, newEmail);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send email change OTP",
    });
  }
};

/**
 * Verify OTP and Complete Email Address Change
 */
export const verifyEmailChange = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    if (!newEmail || !otp) {
      return res.status(400).json({ success: false, message: "New email and OTP code are required" });
    }
    const updatedUser = await userService.verifyAndChangeEmail(req.user.id, newEmail, otp);
    return res.status(200).json({
      success: true,
      message: "Email address updated and verified successfully!",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to verify email OTP",
    });
  }
};

/**
 * Logout User
 */
export const logout = async (req, res) => {
  try {
    if (req.logout && req.session) {
      req.logout((err) => {
        if (err) console.error("Logout session error:", err);
      });
    }

    const result = await userService.logoutUser(req.token);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Logout failed",
    });
  }
};
