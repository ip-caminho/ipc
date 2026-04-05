"use client";

import { createContext, useContext, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { AuthContext, Permission, Role } from "@/types/auth";

const PermissionsContext = createContext<AuthContext | null>(null);

export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const data = useQuery(api.preferencias.rbac.getUserPermissionContext);
  const autoLink = useMutation(api.membros.autoLink.autoLinkByPhone);
  const autoLinkAttempted = useRef(false);

  // Auto-vincular pelo telefone se logado mas sem membro
  useEffect(() => {
    if (
      isConvexAuthenticated &&
      data === null && // logado mas sem membro
      !autoLinkAttempted.current
    ) {
      autoLinkAttempted.current = true;
      autoLink().catch(() => {}); // silencioso — se falhar, não faz nada
    }
    // Reset se deslogar
    if (!isConvexAuthenticated) {
      autoLinkAttempted.current = false;
    }
  }, [isConvexAuthenticated, data, autoLink]);

  const value = useMemo<AuthContext>(() => {
    const isLoading = data === undefined;
    const isAuthenticated = data !== null && data !== undefined;
    const role = (data?.role as Role) ?? null;
    const permissions = new Set(data?.permissions ?? []);

    return {
      isLoading,
      isAuthenticated,
      membroId: data?.membroId ?? null,
      userId: data?.userId ?? null,
      role,
      name: data?.name ?? null,
      foto: data?.foto ?? null,
      phone: data?.phone ?? null,
      isAdmin: role === "admin",

      can: (permission: Permission) => {
        if (!role || !isAuthenticated) return false;
        if (permissions.has("*")) return true;
        if (permissions.has(permission)) return true;
        // Wildcard match: "membros:*" matches "membros:read"
        for (const perm of permissions) {
          if (perm.endsWith(":*") && permission.startsWith(perm.slice(0, -1))) {
            return true;
          }
        }
        return false;
      },

      hasRole: (r: Role) => role === r,
      hasAnyRole: (roles: Role[]) => !!role && roles.includes(role),
    };
  }, [data]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function useAuth(): AuthContext {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("useAuth must be used within PermissionsProvider");
  }
  return ctx;
}
