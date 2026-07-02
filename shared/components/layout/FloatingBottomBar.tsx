"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  MOBILE_PRIMARY_TABS,
  MORE_TAB,
  BOLETIM_TAB,
  isDomingoWindow,
  type NavItem,
} from "@shared/constants/navigation";
import { haptic } from "@shared/lib/haptic";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { MoreSheet } from "@shared/components/layout/MoreSheet";
import { cn } from "@shared/lib/utils/cn";

export function FloatingBottomBar() {
  const pathname = usePathname();
  const { can, hasAnyRole, isLoading } = useAuth();
  const { isActive: audioActive } = useAudioPlayer();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
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
    const base = [...MOBILE_PRIMARY_TABS];
    if (isDomingoWindow()) {
      base.push(BOLETIM_TAB);
    }
    const filtered = base.filter((item) => {
      if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) return false;
      if (item.permission && !can(item.permission)) return false;
      if (item.roles && !hasAnyRole(item.roles)) return false;
      return true;
    });
    return [...filtered, MORE_TAB];
  }, [modulosAtivos, can, hasAnyRole]);

  const isActive = (href: string) => {
    if (href === MORE_TAB.href) return moreOpen;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (isLoading) return null;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-4 left-4 right-4 z-40"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegacao principal"
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
              const isMoreTab = tab.href === MORE_TAB.href;
              const loading = !isMoreTab && pendingHref === tab.href && !active;
              const Icon = tab.icon;

              if (isMoreTab) {
                return (
                  <button
                    key="more"
                    onClick={() => {
                      haptic(15);
                      setMoreOpen(true);
                    }}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] rounded-2xl transition-colors",
                      moreOpen ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={moreOpen ? 2.25 : 1.75} />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </button>
                );
              }

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
                  <span className="text-xs font-medium">{tab.label}</span>
                  {active && (
                    <span className="h-1 w-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
