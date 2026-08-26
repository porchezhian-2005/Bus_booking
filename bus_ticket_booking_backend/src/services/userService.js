import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateTokens, blacklistToken } from '../middleware/auth.js';
import { generateOtp } from '../utils/generatorUtils.js';

/**
 * Service to handle all User-related business logic:
 * - Email OTP Verification (Before / After Registration)
 * - User Registration & Password Hashing
 * - Password Reset Flow via Email OTP
 * - Profile Management (Fetch/Update)
 */
export class UserService {
  constructor(userModel, walletService, referralService, emailService) {
    this.userModel = userModel;
    this.walletService = walletService;
    this.referralService = referralService;
    this.emailService = emailService;
  }

  /**
   * Send Email OTP using HTML Handlebars templates
   */
  async sendEmailOtp(email, purpose = 'VERIFICATION', userName = 'User') {
    const existingUser = await this.userModel.findOne({ where: { email } });

    if (purpose === 'PASSWORD_RESET' && !existingUser) {
      return { message: 'If an account exists with this email, an OTP has been sent.' };
    }

    if (purpose === 'VERIFICATION' && existingUser && existingUser.isVerified) {
      const error = new Error('This email is already registered and verified.');
      error.statusCode = 400;
      throw error;
    }

    const otp = generateOtp();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '1', 10);
    const otpExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);

    if (existingUser) {
      existingUser.emailOtp = otp;
      existingUser.emailOtpExpires = otpExpires;
      await this.userModel.save(existingUser);
    }

    if (this.emailService) {
      const templateName = purpose === 'PASSWORD_RESET' ? 'passwordReset' : 'emailVerification';
      const subject = purpose === 'PASSWORD_RESET' ? 'Password Reset OTP - Bus Ticket Booking' : 'Email Verification OTP - Bus Ticket Booking';

      await this.emailService.sendTemplateEmail(email, subject, templateName, {
        name: existingUser ? existingUser.name : userName,
        otp: otp,
        expiryMinutes: expiryMinutes
      });
    }

    return { message: 'OTP sent to your email successfully', otpExpiryMinutes: expiryMinutes };
  }

  /**
   * Verify Email OTP
   */
  async verifyEmailOtp(email, otp) {
    const user = await this.userModel.findOne({ where: { email } });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (!user.emailOtp || user.emailOtp !== otp) {
      const error = new Error('Invalid OTP code');
      error.statusCode = 400;
      throw error;
    }

    if (user.emailOtpExpires < new Date()) {
      const error = new Error('OTP has expired. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }

    user.isVerified = true;
    user.emailOtp = null;
    user.emailOtpExpires = null;
    await this.userModel.save(user);

    return { message: 'Email verified successfully' };
  }

  /**
   * Register a new user
   */
  async registerUser(userData) {
    const { name, email, phone, password, referralCode } = userData;

    const existingUser = await this.userModel.findOne({
      where: [{ email }, { phone }]
    });

    if (existingUser) {
      const error = new Error('User already exists with this email or phone number');
      error.statusCode = 400;
      throw error;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userReferralCode = await this.referralService.generateUniqueReferralCode(name);

    const newUser = this.userModel.create({
      name,
      email,
      phone,
      password: hashedPassword,
      referralCode: userReferralCode,
      isVerified: false,
      welcomeEmailSent: false,
      role: 'user'
    });
    const savedUser = await this.userModel.save(newUser);

    if (this.walletService) {
      await this.walletService.createWallet(savedUser.id);
    }

    if (referralCode && this.referralService) {
      await this.referralService.processReferralSignup(savedUser.id, referralCode);
    }

    await this.sendEmailOtp(email, 'VERIFICATION', name);

    // Return clean user response shape
    return {
      name: savedUser.name,
      email: savedUser.email,
      phone: savedUser.phone,
      referralCode: savedUser.referralCode,
    };
  }

  /**
   * Initiate Password Reset via Email OTP
   */
  async initiatePasswordReset(email) {
    return await this.sendEmailOtp(email, 'PASSWORD_RESET');
  }

  /**
   * Complete Password Reset with Email OTP
   */
  async resetPasswordWithOtp(email, otp, newPassword) {
    const user = await this.userModel.findOne({ where: { email } });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (!user.emailOtp || user.emailOtp !== otp) {
      const error = new Error('Invalid OTP');
      error.statusCode = 400;
      throw error;
    }

    if (user.emailOtpExpires < new Date()) {
      const error = new Error('OTP has expired. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }

    const saltRounds = 10;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.emailOtp = null;
    user.emailOtpExpires = null;
    await this.userModel.save(user);

    return { message: 'Password reset successfully. You can now login.' };
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId) {
    const user = await this.userModel.findOne({ where: { id: userId } });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId, updateData) {
    const user = await this.userModel.findOne({ where: { id: userId } });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const allowedUpdates = ['name', 'phone'];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateData[key];
      }
    });

    const updatedUser = await this.userModel.save(user);

    return {
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      referralCode: updatedUser.referralCode,
    };
  }

  /**
   * Send 6-digit OTP to new email for email change request
   */
  async requestEmailChangeOtp(userId, newEmail) {
    const user = await this.userModel.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const existing = await this.userModel.findOne({ where: { email: newEmail } });
    if (existing && existing.id !== userId) {
      const error = new Error("This email address is already registered to another account");
      error.statusCode = 400;
      throw error;
    }

    await this.sendEmailOtp(newEmail, "VERIFICATION", user.name);
    return { message: `6-Digit OTP sent to ${newEmail}` };
  }

  /**
   * Verify OTP and update email in PostgreSQL
   */
  async verifyAndChangeEmail(userId, newEmail, otp) {
    const user = await this.userModel.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    await this.verifyEmailOtp(newEmail, otp);

    user.email = newEmail;
    user.isVerified = true;
    const updatedUser = await this.userModel.save(user);

    return {
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      referralCode: updatedUser.referralCode,
    };
  }

  /**
   * Complete login operations and update isLoggedIn status to true
   */
  async loginUser(user) {
    user.isLoggedIn = true;
    await this.userModel.save(user);
    return generateTokens(user);
  }

  /**
   * Refresh JWT Access Token using Refresh Token
   */
  async refreshToken(refreshTokenString) {
    if (!refreshTokenString) {
      const error = new Error("Refresh token is required");
      error.statusCode = 400;
      throw error;
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refreshTokenString,
        process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_token_secret_key_456"
      );
    } catch (err) {
      const error = new Error("Invalid or expired refresh token");
      error.statusCode = 403;
      throw error;
    }

    const user = await this.userModel.findOne({ where: { id: decoded.id } });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return generateTokens(user);
  }

  /**
   * Logout user account by blacklisting active token and updating isLoggedIn status
   */
  async logoutUser(userId, token) {
    if (token) {
      blacklistToken(token);
    }

    if (userId) {
      const user = await this.userModel.findOne({ where: { id: userId } });
      if (user) {
        user.isLoggedIn = false;
        await this.userModel.save(user);
      }
    }

    return { message: "Logged out successfully. Please clear your access and refresh tokens on the client." };
  }
}

export default UserService;
