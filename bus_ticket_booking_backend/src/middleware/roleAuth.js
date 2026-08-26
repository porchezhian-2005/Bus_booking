

/**
 * Middleware to restrict route access by role
 * Usage: authorizeRoles("admin") or authorizeRoles("admin", "superadmin")
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(", ")} role(s)`,
      });
    }
    next();
  };
};

export default authorizeRoles;
