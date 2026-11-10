import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen grid place-items-center text-primary">Loading SafeRoute…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // UI guard only; the /api/admin routes enforce the role on the server.
  if (adminOnly && user.role !== 'admin') return <Navigate to="/home" replace />;
  return <>{children}</>;
}
