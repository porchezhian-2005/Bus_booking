import AppDataSource from "../config/database.js";
import UserEntity from "../models/User.js";
import WalletEntity from "../models/Wallet.js";
import WalletTransactionEntity from "../models/WalletTransaction.js";
import ReferralEntity from "../models/Referral.js";
import SystemConfigEntity from "../models/SystemConfig.js";

import UserService from "./userService.js";
import EmailService from "./emailService.js";
import WalletService from "./walletService.js";
import ReferralService from "./referralService.js";

/**
 * Auth Service
 * Orchestrates authentication workflows and business logic, delegating
 * domain-specific operations to specialized services (UserService, WalletService, ReferralService, EmailService).
 */
export class AuthService {
  constructor(userService = null) {
    if (userService) {
      this.userService = userService;
    } else {
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

      this.userService = new UserService(
        userRepository,
        walletService,
        referralService,
        emailService
      );
    }
  }

  /**
   * Registration Workflow
   * Normalizes phone number formatting and delegates user registration.
   */
  async register(registrationData) {
    const data = { ...registrationData };
    if (data && data.phone) {
      data.phone = String(data.phone).replace(/\D/g, "").slice(-10);
    }
    return await this.userService.registerUser(data);
  }

  /**
   * Email Verification Workflow
   */
  async verifyEmailOtp(email, otp) {
    return await this.userService.verifyEmailOtp(email, otp);
  }

  /**
   * Resend Verification OTP Workflow
   */
  async resendVerificationOtp(email) {
    return await this.userService.sendEmailOtp(email, "VERIFICATION");
  }

  /**
   * User Login Workflow
   * Obtains tokens and constructs authenticated user payload.
   */
  async loginUser(user) {
    const { accessToken, refreshToken } = await this.userService.loginUser(user);
    return {
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
    };
  }

  /**
   * Admin Login Workflow
   * Validates ADMIN / SUPER_ADMIN role authorization, obtains tokens, and constructs admin payload.
   */
  async adminLoginUser(user) {
    const userRole = String(user.role || "").toUpperCase();
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      const error = new Error(
        "Access denied. Only Admin and Super Admin users can log in via this endpoint."
      );
      error.statusCode = 403;
      throw error;
    }

    const { accessToken, refreshToken } = await this.userService.loginUser(user);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh Token Workflow
   */
  async refreshToken(refreshTokenString) {
    return await this.userService.refreshToken(refreshTokenString);
  }

  /**
   * Forgot Password Workflow
   */
  async forgotPassword(email) {
    return await this.userService.initiatePasswordReset(email);
  }

  /**
   * Reset Password Workflow
   */
  async resetPassword(email, otp, newPassword) {
    return await this.userService.resetPasswordWithOtp(email, otp, newPassword);
  }

  /**
   * Get User Profile Workflow
   */
  async getProfile(userId) {
    return await this.userService.getUserProfile(userId);
  }

  /**
   * Update User Profile Workflow
   */
  async updateProfile(userId, updateData) {
    return await this.userService.updateUserProfile(userId, updateData);
  }

  /**
   * Request Email Change OTP Workflow
   */
  async requestEmailChange(userId, newEmail) {
    return await this.userService.requestEmailChangeOtp(userId, newEmail);
  }

  /**
   * Verify and Change Email Workflow
   */
  async verifyEmailChange(userId, newEmail, otp) {
    return await this.userService.verifyAndChangeEmail(userId, newEmail, otp);
  }

  /**
   * Logout Workflow
   */
  async logout(userId, token) {
    return await this.userService.logoutUser(userId, token);
  }
}

export default new AuthService();
