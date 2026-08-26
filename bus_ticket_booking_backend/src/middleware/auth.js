import jwt from "jsonwebtoken";
import AppDataSource from "../config/database.js";
import UserEntity from "../models/User.js";

/**
 * Generate Access & Refresh Tokens
 */
export const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || "your_jwt_access_token_secret_key_123",
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_token_secret_key_456",
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken };
};

// In-memory set to store blacklisted logged-out JWT tokens
const tokenBlacklist = new Set();

export const blacklistToken = (token) => {
  if (token) {
    tokenBlacklist.add(token);
  }
};

/**
 * Middleware to authenticate requests using JWT Access Token
 */
export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing or invalid format (Bearer <token> required)",
    });
  }

  const token = authHeader.split(" ")[1];

  // Check if token has been blacklisted via Logout
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({
      success: false,
      message: "Token has been logged out. Please log in again.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "your_jwt_access_token_secret_key_123"
    );
    req.user = decoded;
    req.token = token;

    // Verify user login status in database
    const userRepository = AppDataSource.getRepository(UserEntity);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user || user.isLoggedIn === false) {
      return res.status(401).json({
        success: false,
        message: "User is logged out. Please log in again to access user data.",
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
        isExpired: true,
      });
    }
    return res.status(403).json({
      success: false,
      message: "Invalid or corrupted access token",
    });
  }
};
