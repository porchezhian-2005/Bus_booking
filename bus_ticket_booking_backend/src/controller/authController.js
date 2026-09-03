import passport from "passport";
import authService from "../services/authService.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validation/authValidation.js";

/**
 * Register User
 */
export const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const userData = await authService.register(value);
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

    const result = await authService.verifyEmailOtp(value.email, value.otp);
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

    const result = await authService.resendVerificationOtp(email);
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
      const loginData = await authService.loginUser(user);

      return res.status(200).json({
        success: true,
        message: "User login successful",
        data: loginData,
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

    try {
      const adminLoginData = await authService.adminLoginUser(user);

      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: adminLoginData,
      });
    } catch (loginErr) {
      const statusCode = loginErr.statusCode || 500;
      const message = loginErr.statusCode ? loginErr.message : "Admin login failed";
      return res.status(statusCode).json({ success: false, message });
    }
  })(req, res, next);
};

/**
 * Refresh Access Token
 */
export const refreshToken = async (req, res) => {
  try {
    const tokens = await authService.refreshToken(req.body.refreshToken);
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

    const result = await authService.forgotPassword(value.email);
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

    const result = await authService.resetPassword(value.email, value.otp, value.newPassword);
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
    const user = await authService.getProfile(req.user.id);
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

    const updatedProfile = await authService.updateProfile(req.user.id, value);
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
    const result = await authService.requestEmailChange(req.user.id, newEmail);
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
    const updatedUser = await authService.verifyEmailChange(req.user.id, newEmail, otp);
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

    const result = await authService.logout(req.user?.id, req.token);
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
