import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router";

/**
 * Reusable ProtectedRoute component for RBAC route protection.
 * Props:
 * - allowedRoles: Array of role strings allowed to access the route
 * - requireAdmin: Boolean if route is restricted to Admin / Super Admin
 * - requireCustomer: Boolean if route is restricted to USER (customer)
 */
export const ProtectedRoute = ({ children, allowedRoles, requireAdmin, requireCustomer }) => {
  const { token, role } = useSelector((state) => state.auth);
  const location = useLocation();

  const effectiveRole = role || localStorage.getItem("userRole") || "";
  const normalizedRole = String(effectiveRole).toUpperCase();
  const isAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";

  // 1. Unauthenticated Check
  if (!token) {
    const isTargetingAdmin = location.pathname.startsWith("/admin");
    return <Navigate to={isTargetingAdmin ? "/admin/login" : "/login"} replace />;
  }

  // 2. Customer-Only Route Protection (e.g. /my-bookings, /wallet, /profile)
  if (requireCustomer && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // 3. Admin-Only Route Protection (e.g. /admin)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // 4. Explicit Allowed Roles Check (if provided)
  if (allowedRoles && allowedRoles.length > 0) {
    const uppercaseAllowed = allowedRoles.map((r) => String(r).toUpperCase());
    const isRoleAllowed = uppercaseAllowed.includes(normalizedRole) || (uppercaseAllowed.includes("ADMIN") && isAdmin);
    if (!isRoleAllowed) {
      return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
