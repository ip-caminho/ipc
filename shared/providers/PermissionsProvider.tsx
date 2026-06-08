"use client";

import { createContext, useContext, useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { INITIAL_ROLE_PERMISSIONS } from "@convex/preferencias/rbacHelpers";
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

  const pathname = usePathname();
  const router = useRouter();
  // Persiste a impersonacao na aba (sessionStorage): sem isso, F5 ou abrir uma
  // URL direto resetava o estado e o admin voltava ao papel real sem perceber.
  // No SSR nao ha sessionStorage; o primeiro render do client ainda esta em
  // loading de permissoes, entao nao ha mismatch pratico de hidratacao.
  const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    return (sessionStorage.getItem("impersonated-role") as Role | null) ?? null;
  });

  const impersonate = useCallback((role: Role) => {
    sessionStorage.setItem("impersonated-role", role);
    setImpersonatedRole(role);
  }, []);
  const stopImpersonating = useCallback(() => {
    sessionStorage.removeItem("impersonated-role");
    setImpersonatedRole(null);
  }, []);

  // Auto-vincular pelo telefone se logado mas sem membro
  useEffect(() => {
    if (
      isConvexAuthenticated &&
      data === null && // logado mas sem membro
      !autoLinkAttempted.current
    ) {
      autoLinkAttempted.current = true;
      autoLink().catch(() => {});
    }
    if (!isConvexAuthenticated) {
      autoLinkAttempted.current = false;
    }
  }, [isConvexAuthenticated, data, autoLink]);

  // Redirecionar para onboarding se primeiro acesso
  useEffect(() => {
    if (
      data &&
      data.onboardingCompleto === false &&
      data.role !== "admin" && // admin pula onboarding
      pathname !== "/bem-vindo"
    ) {
      router.replace("/bem-vindo");
    }
  }, [data, pathname, router]);

  // Ouvinte (acesso externo) so navega em gravacoes; qualquer outra rota volta la
  useEffect(() => {
    if (data && data.role === "ouvinte" && !pathname.startsWith("/gravacoes")) {
      router.replace("/gravacoes");
    }
  }, [data, pathname, router]);

  const value = useMemo<AuthContext>(() => {
    const isLoading = data === undefined;
    const isAuthenticated = data !== null && data !== undefined;
    const realRole = (data?.role as Role) ?? null;
    const isRealAdmin = realRole === "admin";
    const isImpersonating = isRealAdmin && impersonatedRole !== null;

    const role = isImpersonating ? impersonatedRole : realRole;
    const permissions = isImpersonating
      ? new Set(INITIAL_ROLE_PERMISSIONS[impersonatedRole] ?? [])
      : new Set(data?.permissions ?? []);

    return {
      isLoading,
      isAuthenticated,
      membroId: data?.membroId ?? null,
      userId: data?.userId ?? null,
      role,
      name: data?.name ?? null,
      foto: data?.foto ?? null,
      phone: data?.phone ?? null,
      isAdmin: isImpersonating ? false : isRealAdmin,

      can: (permission: Permission) => {
        if (!role || !isAuthenticated) return false;
        if (permissions.has("*")) return true;
        if (permissions.has(permission)) return true;
        for (const perm of permissions) {
          if (perm.endsWith(":*") && permission.startsWith(perm.slice(0, -1))) {
            return true;
          }
        }
        return false;
      },

      hasRole: (r: Role) => role === r,
      hasAnyRole: (roles: Role[]) => !!role && roles.includes(role),

      isImpersonating,
      impersonate,
      stopImpersonating,
    };
  }, [data, impersonatedRole, impersonate, stopImpersonating]);

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
