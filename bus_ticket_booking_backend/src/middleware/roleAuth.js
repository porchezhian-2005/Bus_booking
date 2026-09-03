

/**
 * Middleware to restrict route access by role
 * Roles supported: USER, ADMIN, SUPER_ADMIN
 * Note: SUPER_ADMIN automatically satisfies ADMIN access requirements unless restricted to SUPER_ADMIN only.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing user authentication context",
      });
    }

    const userRole = String(req.user.role).toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    let isAuthorized = normalizedAllowed.includes(userRole);

    // Role Hierarchy: SUPER_ADMIN inherits all ADMIN privileges
    if (!isAuthorized && normalizedAllowed.includes("ADMIN") && userRole === "SUPER_ADMIN") {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(", ")} role(s)`,
      });
    }
    next();
  };
};

export default authorizeRoles;
