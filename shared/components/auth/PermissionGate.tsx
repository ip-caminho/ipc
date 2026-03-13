"use client";

import { useAuth } from "@shared/providers/PermissionsProvider";
import type { Permission } from "@/types/auth";

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  skeleton?: React.ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
  skeleton = null,
}: PermissionGateProps) {
  const { can, isLoading } = useAuth();
  if (isLoading) return <>{skeleton}</>;
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

export function AnyPermissionGate({
  permissions,
  children,
  fallback = null,
  skeleton = null,
}: {
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const { can, isLoading } = useAuth();
  if (isLoading) return <>{skeleton}</>;
  if (!permissions.some((p) => can(p))) return <>{fallback}</>;
  return <>{children}</>;
}

export function AllPermissionsGate({
  permissions,
  children,
  fallback = null,
  skeleton = null,
}: {
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const { can, isLoading } = useAuth();
  if (isLoading) return <>{skeleton}</>;
  if (!permissions.every((p) => can(p))) return <>{fallback}</>;
  return <>{children}</>;
}
