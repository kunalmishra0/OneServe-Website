import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, UserRole } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Determine active effective role
  const effectiveRole: UserRole =
    role || (user?.user_metadata?.role as UserRole) || "citizen";

  if (!allowedRoles.includes(effectiveRole)) {
    // Redirect to the appropriate portal according to their real identity
    if (effectiveRole === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (effectiveRole === "worker") {
      return <Navigate to="/field-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
