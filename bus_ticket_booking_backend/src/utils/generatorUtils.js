import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Generate 6-digit numeric OTP code
 */
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate 10-digit unique PNR code for bus bookings
 */
export const generatePNR = () => {
  const timestamp = Date.now().toString().slice(-6);
  const randomDigits = Math.floor(10 + Math.random() * 90);
  return `PNR${timestamp}${randomDigits}`;
};

/**
 * Generate unique 8-character referral code
 */
export const generateReferralCode = (prefix = "USER") => {
  const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}${randomHex}`;
};

/**
 * Generate JWT Access and Refresh Tokens
 */
export const generateJwtTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || "access_secret", {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "refresh_secret", {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

  return { accessToken, refreshToken };
};

export default {
  generateOtp,
  generatePNR,
  generateReferralCode,
  generateJwtTokens,
};
