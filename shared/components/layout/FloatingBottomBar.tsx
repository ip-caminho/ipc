"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  PRIMARY_TABS,
  GESTAO_TAB,
  BOLETIM_TAB,
  ELEVATED_ROLES,
  isDomingoWindow,
  type NavItem,
} from "@shared/constants/navigation";
import { haptic } from "@shared/lib/haptic";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { cn } from "@shared/lib/utils/cn";

export function FloatingBottomBar() {
  const pathname = usePathname();
  const { hasAnyRole, can, isLoading } = useAuth();
  const { isActive: audioActive } = useAudioPlayer();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // @ts-expect-error Convex TS2589
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);

  useEffect(() => {
    if (
      pendingHref &&
      (pathname === pendingHref ||
        (pendingHref !== "/dashboard" && pathname.startsWith(pendingHref)))
    ) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const tabs: NavItem[] = useMemo(() => {
    const result = [...PRIMARY_TABS];
    if (hasAnyRole(ELEVATED_ROLES)) result.push(GESTAO_TAB);
    if (isDomingoWindow()) result.push(BOLETIM_TAB);
    return result.filter((item) => {
      if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) return false;
      if (item.permission && !can(item.permission)) return false;
      return true;
    });
  }, [hasAnyRole, modulosAtivos, can]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (isLoading) return null;

  return (
    <nav
      className="md:hidden fixed bottom-4 left-4 right-4 z-[56]"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <div
        className={cn(
          "flex flex-col overflow-hidden border bg-background/75 supports-[backdrop-filter]:bg-background/60 shadow-lg",
          audioActive ? "rounded-3xl" : "rounded-full",
        )}
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: "var(--floating-bar-border)",
        }}
      >
        {audioActive && (
          <div className="border-b border-border/50">
            <GlobalAudioPlayer compact />
          </div>
        )}
        <div className="flex items-stretch px-2 py-1.5">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const loading = pendingHref === tab.href && !active;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                onClick={() => {
                  if (!active) {
                    haptic(15);
                    setPendingHref(tab.href);
                  }
                }}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] rounded-2xl transition-colors",
                  active
                    ? "text-primary"
                    : loading
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn("h-[22px] w-[22px]", loading && "animate-pulse")}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
