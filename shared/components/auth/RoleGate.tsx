"use client";

import { useAuth } from "@shared/providers/PermissionsProvider";

export function AdminGate({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAdmin, isLoading, isImpersonating } = useAuth();
  if (isLoading) return null;
  // Admin simulando outro role ainda pode acessar areas admin
  if (!isAdmin && !isImpersonating) return <>{fallback}</>;
  return <>{children}</>;
}
