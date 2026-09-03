import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router";

/**
 * Reusable ProtectedRoute component for RBAC route protection.
 * Props:
 * - allowedRoles: Array of role strings allowed to access the route (e.g. ["user"] or ["admin", "super_admin"])
 * - requireAdmin: Boolean if route is restricted to ADMIN or SUPER_ADMIN
 * - requireCustomer: Boolean if route is restricted to USER (customer)
 */
export const ProtectedRoute = ({ children, allowedRoles, requireAdmin, requireCustomer }) => {
  const { token, role } = useSelector((state) => state.auth);
  const location = useLocation();

  const normalizedRole = String(role || "").toUpperCase();
  const isAdminOrSuperAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";

  // 1. Unauthenticated Check
  if (!token) {
    // If attempting to access admin page, redirect to admin login portal, else user login
    const isTargetingAdmin = location.pathname.startsWith("/admin");
    return <Navigate to={isTargetingAdmin ? "/admin/login" : "/login"} replace />;
  }

  // 2. Customer-Only Route Protection (e.g. /my-bookings, /wallet, /profile)
  if (requireCustomer && isAdminOrSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // 3. Admin-Only Route Protection (e.g. /admin)
  if (requireAdmin && !isAdminOrSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // 4. Explicit Allowed Roles Check (if provided)
  if (allowedRoles && allowedRoles.length > 0) {
    const uppercaseAllowed = allowedRoles.map((r) => String(r).toUpperCase());
    const isRoleAllowed = uppercaseAllowed.includes(normalizedRole) || (uppercaseAllowed.includes("ADMIN") && isAdminOrSuperAdmin);
    if (!isRoleAllowed) {
      return <Navigate to={isAdminOrSuperAdmin ? "/admin" : "/"} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
