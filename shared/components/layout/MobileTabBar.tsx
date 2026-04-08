"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, Mic, CalendarCheck, DoorOpen, HandHeart, Menu, BookOpen, Music, Users, Heart, Baby, Shield, LogOut, CalendarDays, UsersRound, FileText, Church, Megaphone, LayoutGrid, UserCircle, Ear, HeartHandshake, Loader2 } from "lucide-react";
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
];

type DrawerItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string | null;
  modulo?: string;
};

type DrawerSection = {
  titulo: string;
  items: DrawerItem[];
};

const drawerSections: DrawerSection[] = [
  {
    titulo: "Culto",
    items: [
      { label: "Boletim", href: "/boletim", icon: FileText, permission: "escalas:read", modulo: "boletim" },
      { label: "Louvar", href: "/louvor", icon: Music, permission: null, modulo: "louvor" },
      { label: "Calendário", href: "/calendario", icon: CalendarDays, permission: "calendario:read", modulo: "calendario" },
    ],
  },
  {
    titulo: "Comunidade",
    items: [
      { label: "Diretório", href: "/diretorio", icon: BookOpen, permission: "diretorio:read", modulo: "diretorio" },
      { label: "Salas", href: "/salas", icon: DoorOpen, permission: "salas:read", modulo: "salas" },
      { label: "Ministérios", href: "/ministerios", icon: Users, permission: "ministerios:read", modulo: "ministerios" },
      { label: "Pequenos Grupos", href: "/pequenos-grupos", icon: UsersRound, permission: "pequenos_grupos:read", modulo: "pequenos-grupos" },
      { label: "Pastoreio", href: "/pastoreio", icon: Heart, permission: "pastoreio:read", modulo: "pastoreio" },
      { label: "Educacional", href: "/educacional", icon: Baby, permission: "educacional:read", modulo: "educacional" },
    ],
  },
  {
    titulo: "Gestão",
    items: [
      { label: "Cultos", href: "/cultos", icon: CalendarCheck, permission: "escalas:read", modulo: "escalas" },
      { label: "Equipes e Escalas", href: "/admin/escalas", icon: CalendarCheck, permission: "escalas:update", modulo: "escalas" },
      { label: "Avisos", href: "/avisos", icon: Megaphone, permission: "escalas:read", modulo: "escalas" },
      { label: "Membros", href: "/membros", icon: Users, permission: "membros:read", modulo: "membros" },
    ],
  },
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
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Limpa estado otimista quando a navegacao completa
  useEffect(() => {
    if (pendingHref && (pathname === pendingHref || (pendingHref !== "/dashboard" && pathname.startsWith(pendingHref)))) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const isVisible = (item: DrawerItem) => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) return false;
    if (item.permission && !can(item.permission as any)) return false;
    return true;
  };

  const visibleSections = drawerSections
    .map((s) => ({ ...s, items: s.items.filter(isVisible) }))
    .filter((s) => s.items.length > 0);
  const visibleAdminItems = isAdmin ? adminDrawerItems.filter(isVisible) : [];

  const allDrawerItems = [...visibleSections.flatMap((s) => s.items), ...visibleAdminItems];
  const isMoreActive = allDrawerItems.some((item) => isActive(item.href));

  return (
    <div className="fixed bottom-0 inset-x-0 z-[56] border-t bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const loading = pendingHref === tab.href && !active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => { if (!active) setPendingHref(tab.href); }}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 min-h-[68px] transition-colors ${
                active || loading ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <tab.icon className="h-6 w-6" />
              )}
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
            <div className="px-2 pb-6 max-h-[60vh] overflow-y-auto space-y-4">
              {visibleSections.map((section) => (
                <div key={section.titulo}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-2">{section.titulo}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {section.items.map((item) => (
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
                </div>
              ))}

              {visibleAdminItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-2">Admin</p>
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
                </div>
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
