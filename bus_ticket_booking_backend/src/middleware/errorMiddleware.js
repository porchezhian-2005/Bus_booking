/**
 * Centralized Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode === 500) {
    console.error("Internal Server Error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    message: message,
  });
};

export default errorHandler;
