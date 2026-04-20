"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  PRIMARY_TABS,
  BOLETIM_TAB,
  GESTAO_TAB,
  ELEVATED_ROLES,
  isDomingoWindow,
  type NavItem,
} from "@shared/constants/navigation";

export function MobileTabBar() {
  const pathname = usePathname();
  const { hasAnyRole, isLoading } = useAuth();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isBoletim, setIsBoletim] = useState(false);

  // Computa janela de boletim somente no cliente para evitar mismatch SSR
  useEffect(() => {
    setIsBoletim(isDomingoWindow());
  }, []);

  useEffect(() => {
    if (
      pendingHref &&
      (pathname === pendingHref ||
        (pendingHref !== "/dashboard" && pathname.startsWith(pendingHref)))
    ) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const isGestaoRole = hasAnyRole(ELEVATED_ROLES);

  const tabs: NavItem[] = useMemo(() => {
    const result = [...PRIMARY_TABS];
    if (isBoletim) result.push(BOLETIM_TAB);
    if (isGestaoRole) result.push(GESTAO_TAB);
    return result;
  }, [isBoletim, isGestaoRole]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (isLoading) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-[56] border-t bg-background md:hidden pb-safe">
        <nav className="flex items-stretch h-[68px]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[56] border-t bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const loading = pendingHref === tab.href && !active;
          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              onClick={() => {
                if (!active) setPendingHref(tab.href);
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-colors ${
                active
                  ? "text-primary"
                  : loading
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon
                className={`h-6 w-6 ${loading ? "animate-pulse" : ""}`}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
