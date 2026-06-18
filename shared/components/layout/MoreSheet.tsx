"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components/ui/avatar";
import { Separator } from "@/shared/components/ui/separator";
import { LogOut, User, Moon, Sun } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  GESTAO_SECTIONS,
  type NavItem,
} from "@shared/constants/navigation";
import { cn } from "@shared/lib/utils/cn";
import { useTheme } from "next-themes";
import { useAuthActions } from "@convex-dev/auth/react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreSheet({ open, onOpenChange }: Props) {
  const pathname = usePathname();

  // Protecao contra tap-through: o sheet desliza e o rodape (Modo escuro/Sair)
  // para exatamente debaixo do dedo que tocou o "Mais" na bottom bar — um
  // ghost click ou segundo toque durante a animacao (500ms) disparava esses
  // itens. Bloqueia pointer-events do conteudo ate a animacao terminar.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(open), open ? 550 : 0);
    return () => clearTimeout(t);
  }, [open]);
  const { name, role, foto, can, hasAnyRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuthActions();
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);

  // Mesma lista do sidebar desktop, filtrada por RBAC. Sem "modo gestao".
  const sections = GESTAO_SECTIONS;

  const isVisible = (item: NavItem) => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) return false;
    if (item.permission && !can(item.permission)) return false;
    if (item.roles && !hasAnyRole(item.roles)) return false;
    return true;
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* z-[60] fica acima da FloatingBottomBar (z-[56]) — sem isso o rodape do
          sheet (Modo escuro/Sair) ficava escondido atras da barra flutuante */}
      <SheetContent side="bottom" className="z-[60] h-[85vh] rounded-t-2xl px-0">
        {/* Escudo anti tap-through: captura toques enquanto o sheet desliza */}
        {!armed && <div className="absolute inset-0 z-50" aria-hidden />}
        <SheetHeader className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {foto && <AvatarImage src={foto} alt={name || ""} />}
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-base truncate">{name}</SheetTitle>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {sections.map((section) => {
            const visibleItems = section.items.filter(isVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.titulo}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  {section.titulo}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground active:bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="px-3 py-3 space-y-1">
          <Link
            href="/meu-perfil"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-foreground active:bg-muted"
          >
            <User className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-sm">Meu perfil</span>
          </Link>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left text-foreground active:bg-muted"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Moon className="h-5 w-5" strokeWidth={1.75} />
            )}
            <span className="text-sm">{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
          </button>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left text-red-600 dark:text-red-400 active:bg-muted"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
