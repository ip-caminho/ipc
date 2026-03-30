"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Mic, CalendarCheck, HandHeart, Menu, BookOpen, Music, Users, Heart, Baby, Shield, LogOut, CalendarDays, UsersRound, FileText, Church, Megaphone, LayoutGrid, UserCircle, Ear } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/shared/components/ui/drawer";

type TabItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tabs: TabItem[] = [
  { label: "Início", href: "/dashboard", icon: Home },
  { label: "Ouvir", href: "/gravacoes", icon: Ear },
  { label: "Orar", href: "/pedidos-oracao", icon: HandHeart },
  { label: "Louvar", href: "/louvor", icon: Music },
];

type DrawerItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string | null;
  modulo?: string;
};

const drawerItems: DrawerItem[] = [
  { label: "Escalas", href: "/escalas", icon: CalendarCheck, permission: null, modulo: "escalas" },
  { label: "Boletim", href: "/boletim", icon: FileText, permission: "escalas:read", modulo: "boletim" },
  { label: "Diretório", href: "/diretorio", icon: BookOpen, permission: "diretorio:read", modulo: "diretorio" },
  { label: "Calendário", href: "/calendario", icon: CalendarDays, permission: "calendario:read", modulo: "calendario" },
  { label: "Próximo Domingo", href: "/proximo-domingo", icon: Church, permission: "escalas:read", modulo: "escalas" },
  { label: "Cultos", href: "/cultos", icon: CalendarCheck, permission: "escalas:read", modulo: "escalas" },
  { label: "Avisos", href: "/avisos", icon: Megaphone, permission: "escalas:read", modulo: "escalas" },
  { label: "Ministérios", href: "/ministerios", icon: Users, permission: "ministerios:read", modulo: "ministerios" },
  { label: "Pequenos Grupos", href: "/pequenos-grupos", icon: UsersRound, permission: "pequenos_grupos:read", modulo: "pequenos-grupos" },
  { label: "Pastoreio", href: "/pastoreio", icon: Heart, permission: "pastoreio:read", modulo: "pastoreio" },
  { label: "Educacional", href: "/educacional", icon: Baby, permission: "educacional:read", modulo: "educacional" },
  { label: "Membros", href: "/membros", icon: Users, permission: "membros:read", modulo: "membros" },
];

const adminDrawerItems: DrawerItem[] = [
  { label: "Gravações", href: "/admin/gravacoes", icon: Mic, permission: null },
  { label: "Permissões", href: "/admin/permissoes", icon: Shield, permission: null },
  { label: "Módulos", href: "/admin/modulos", icon: LayoutGrid, permission: null },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { can, isAdmin } = useAuth();
  const { signOut } = useAuthActions();
  // @ts-ignore Convex TS2589
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const isVisible = (item: DrawerItem) => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) return false;
    if (item.permission && !can(item.permission as any)) return false;
    return true;
  };

  const visibleDrawerItems = drawerItems.filter(isVisible);
  const visibleAdminItems = isAdmin ? adminDrawerItems.filter(isVisible) : [];

  // Check if "Mais" tab is active (current page is in drawer items)
  const isMoreActive = [...visibleDrawerItems, ...visibleAdminItems].some((item) => isActive(item.href));

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background md:hidden">
      <nav className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* Mais — Drawer */}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
              isMoreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-sm">Menu</DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-1">
                {visibleDrawerItems.map((item) => (
                  <DrawerClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={`flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 min-h-[68px] transition-colors ${
                        isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                    </Link>
                  </DrawerClose>
                ))}
              </div>

              {visibleAdminItems.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mt-4 mb-2 px-2">Admin</p>
                  <div className="grid grid-cols-4 gap-1">
                    {visibleAdminItems.map((item) => (
                      <DrawerClose key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={`flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 min-h-[68px] transition-colors ${
                            isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                        </Link>
                      </DrawerClose>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-4 pt-4 border-t space-y-1">
                <DrawerClose asChild>
                  <Link
                    href="/meu-perfil"
                    className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors min-h-[44px]"
                  >
                    <UserCircle className="h-4 w-4" />
                    Meu perfil
                  </Link>
                </DrawerClose>
                <button
                  onClick={() => { setOpen(false); signOut(); }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </nav>
    </div>
  );
}
