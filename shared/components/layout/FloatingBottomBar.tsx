"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  MOBILE_PRIMARY_TABS,
  MORE_TAB,
  type NavItem,
} from "@shared/constants/navigation";
import { haptic } from "@shared/lib/haptic";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { MoreSheet } from "@shared/components/layout/MoreSheet";
import { cn } from "@shared/lib/utils/cn";

// iOS em PWA (standalone): depois que o teclado fecha, o visual viewport as
// vezes fica deslocado do layout viewport. Como `fixed` ancora no layout
// viewport, a barra passa a "andar" junto com o scroll. Aqui ela e reancorada
// no fundo do visual viewport e escondida enquanto o teclado esta aberto.
// So em standalone: no Safari normal a barra de ferramentas ja faz esse ajuste.
// `montada`: a <nav> so existe depois do loading — o effect precisa rodar de
// novo nesse momento para aplicar o ajuste inicial.
function useAncoraNoVisualViewport(ref: React.RefObject<HTMLElement | null>, montada: boolean) {
  const [tecladoAberto, setTecladoAberto] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!vv || !standalone) return;

    let frame = 0;
    const atualizar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        const alturaLayout = document.documentElement.clientHeight;
        // Teclado: o visual viewport encolhe bem mais que qualquer barra do
        // sistema. Com pinch-zoom (scale > 1) ele tambem encolhe — nao e teclado.
        setTecladoAberto(vv.scale <= 1.01 && alturaLayout - vv.height > 150);
        if (!el) return;
        // Fundo do visual viewport vs fundo do layout viewport (onde o fixed ancora)
        const desvio = vv.offsetTop + vv.height - alturaLayout;
        el.style.transform = Math.abs(desvio) > 1 ? `translateY(${desvio}px)` : "";
      });
    };

    atualizar();
    vv.addEventListener("resize", atualizar);
    vv.addEventListener("scroll", atualizar);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", atualizar);
      vv.removeEventListener("scroll", atualizar);
    };
  }, [ref, montada]);

  return tecladoAberto;
}

export function FloatingBottomBar() {
  const pathname = usePathname();
  const { can, hasAnyRole, isLoading } = useAuth();
  const { isActive: audioActive } = useAudioPlayer();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const tecladoAberto = useAncoraNoVisualViewport(navRef, !isLoading);
  // @ts-ignore Convex TS2589
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
        ref={navRef}
        className={cn("md:hidden fixed bottom-4 left-4 right-4 z-40", tecladoAberto && "hidden")}
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
                    aria-label={tab.label}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center py-2 min-h-[56px] rounded-2xl transition-colors",
                      moreOpen ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={moreOpen ? 2.25 : 1.75} />
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
                  aria-label={tab.label}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] rounded-2xl transition-colors",
                    active
                      ? "text-primary"
                      : loading
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={cn("h-6 w-6", loading && "animate-pulse")}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
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
