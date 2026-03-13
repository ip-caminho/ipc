/**
 * Pure RBAC helper functions extracted for testability.
 * Used by rbac.ts queries — no Convex runtime dependency.
 */

export const INITIAL_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  secretaria: [
    "membros:read", "membros:create", "membros:update",
    "entidades:read", "entidades:create", "entidades:update", "entidades:delete",
    "diretorio:read",
    "gravacoes:read", "gravacoes:create", "gravacoes:update", "gravacoes:delete", "gravacoes:process_ai",
    "audit:read",
  ],
  membro: [
    "membros:self_service",
    "diretorio:read",
    "gravacoes:read",
  ],
};

/**
 * Resolve effective permissions for a member.
 * Priority: membro-level overrides > role-level from DB > initial defaults.
 */
export function resolvePermissions(
  membroPermissions: string[] | undefined,
  rolePermissionsFromDb: string[] | undefined,
  role: string
): string[] {
  if (membroPermissions && membroPermissions.length > 0) {
    return membroPermissions;
  }
  return rolePermissionsFromDb ?? INITIAL_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a permission set grants a specific permission.
 * Supports wildcard "*" (admin has all permissions).
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes("*") || permissions.includes(permission);
}

/**
 * Toggle a permission in a list.
 * Returns a new array — does not mutate.
 */
export function togglePermission(
  currentPerms: string[],
  permission: string,
  grant: boolean
): string[] {
  if (grant) {
    return currentPerms.includes(permission)
      ? [...currentPerms]
      : [...currentPerms, permission];
  }
  return currentPerms.filter((p) => p !== permission);
}
