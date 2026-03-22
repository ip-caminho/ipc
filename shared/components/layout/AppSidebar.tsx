"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/shared/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Users,
  UserCircle,
  BookOpen,
  Mic,
  CalendarDays,
  CalendarCheck,
  Home,
  Shield,
  LogOut,
  Church,
  FileText,
  UsersRound,
  Heart,
  HandHeart,
  LayoutGrid,
  Baby,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";

type MenuItem = {
  label: string;
  href: string;
  icon: any;
  permission: string | null;
  modulo?: string;
  tooltip: string;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const topItems: MenuItem[] = [
  { label: "Sermoes", href: "/gravacoes", icon: Mic, permission: "gravacoes:read", modulo: "gravacoes", tooltip: "Ouca os sermoes e estudos da igreja" },
  { label: "Boletim", href: "/boletim", icon: FileText, permission: "escalas:read", modulo: "boletim", tooltip: "Boletim do proximo culto dominical" },
];

const menuSections: MenuSection[] = [
  {
    label: "Nossa Comunidade",
    items: [
      { label: "Diretorio", href: "/diretorio", icon: BookOpen, permission: "diretorio:read", modulo: "diretorio", tooltip: "Contatos e aniversarios dos membros" },
      { label: "Pedidos de Oracao", href: "/pedidos-oracao", icon: HandHeart, permission: "pedidos_oracao:read", modulo: "pedidos-oracao", tooltip: "Compartilhe e ore pelos pedidos da igreja" },
      { label: "Calendario", href: "/calendario", icon: CalendarDays, permission: "calendario:read", modulo: "calendario", tooltip: "Eventos e calendario da igreja" },
      { label: "Escalas", href: "/escalas", icon: CalendarCheck, permission: null, modulo: "escalas", tooltip: "Veja sua escala e marque disponibilidade" },
    ],
  },
  {
    label: "Gestao",
    items: [
      { label: "Cultos", href: "/cultos", icon: Church, permission: "escalas:read", modulo: "escalas", tooltip: "Liturgia, escalas e avisos do culto" },
      { label: "Ministerios", href: "/ministerios", icon: Users, permission: "ministerios:read", modulo: "ministerios", tooltip: "Ministerios e equipes da igreja" },
      { label: "Pequenos Grupos", href: "/pequenos-grupos", icon: UsersRound, permission: "pequenos_grupos:read", modulo: "pequenos-grupos", tooltip: "Grupos de estudo e comunhao" },
      { label: "Pastoreio", href: "/pastoreio", icon: Heart, permission: "pastoreio:read", modulo: "pastoreio", tooltip: "Visitas pastorais e acompanhamento" },
      { label: "Educacional", href: "/educacional", icon: Baby, permission: "educacional:read", modulo: "educacional", tooltip: "Turmas e criancas do educacional infantil" },
      { label: "Membros", href: "/membros", icon: Users, permission: "membros:read", modulo: "membros", tooltip: "Cadastro e gestao da membresia" },
      // { label: "Entidades", href: "/entidades", icon: UserCircle, permission: "entidades:read", modulo: "entidades", tooltip: "Pessoas e organizacoes (PF/PJ)" },
    ],
  },
];

const adminItems: MenuItem[] = [
  { label: "Gravacoes", href: "/admin/gravacoes", icon: Mic, permission: null, tooltip: "Gerenciar gravacoes e processamento IA" },
  { label: "Permissoes", href: "/admin/permissoes", icon: Shield, permission: null, tooltip: "Controle de acesso e convites" },
  { label: "Modulos", href: "/admin/modulos", icon: LayoutGrid, permission: null, tooltip: "Ativar ou desativar funcionalidades" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { can, isAdmin, name, role } = useAuth();
  const { signOut } = useAuthActions();
  // @ts-ignore Convex TS2589
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);

  const isItemVisible = (item: MenuItem) => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) {
      return false;
    }
    if (item.permission && !can(item.permission as any)) {
      return false;
    }
    return true;
  };

  const isActive = (href: string) =>
    !pathname.startsWith("/admin") &&
    (pathname === href || (href !== "/" && pathname.startsWith(href)));

  const isAdminActive = (href: string) =>
    href.startsWith("/admin")
      ? pathname.startsWith(href)
      : pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Church className="h-6 w-6" />
          <span className="font-bold text-lg">IPC</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <TooltipProvider delayDuration={400}>
          {/* Inicio + top items */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={pathname === "/"}>
                        <Link href="/">
                          <Home className="h-4 w-4" />
                          <span>Inicio</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Painel principal e avisos</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
                {topItems.filter(isItemVisible).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive(item.href)}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.tooltip}</TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Secoes agrupadas */}
          {menuSections.map((section) => {
            const visibleItems = section.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild isActive={isActive(item.href)}>
                              <Link href={item.href}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.tooltip}</TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}

          {/* Admin */}
          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.filter(isItemVisible).map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isAdminActive(item.href)}>
                            <Link href={item.href}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.tooltip}</TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </TooltipProvider>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name || "Usuario"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {role || ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
