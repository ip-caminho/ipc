"use client";

import { useAuth } from "@shared/providers/PermissionsProvider";

export function AdminGate({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
