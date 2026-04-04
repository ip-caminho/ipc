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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/shared/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
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
  Music,
  Megaphone,
  ChevronRight,
  DoorOpen,
  Sun,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
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
  { label: "Ouvir", href: "/gravacoes", icon: Mic, permission: "gravacoes:read", modulo: "gravacoes", tooltip: "Ouça os sermões e estudos da igreja" },
  { label: "Boletim", href: "/boletim", icon: FileText, permission: "escalas:read", modulo: "boletim", tooltip: "Boletim do proximo culto dominical" },
  { label: "Louvor", href: "/louvor", icon: Music, permission: "louvor:read", modulo: "louvor", tooltip: "Repertorio de musicas com cifras e tons" },
];

// Subitens de "Cultos"
const cultoSubItems: MenuItem[] = [
  { label: "Próximo Domingo", href: "/proximo-domingo", icon: Sun, permission: "escalas:read", modulo: "escalas", tooltip: "Visão completa do próximo culto" },
  { label: "Planejamento", href: "/cultos", icon: CalendarCheck, permission: "escalas:read", modulo: "escalas", tooltip: "Planejamento de escalas e liturgia dos cultos" },
  { label: "Avisos", href: "/avisos", icon: Megaphone, permission: "escalas:read", modulo: "escalas", tooltip: "Avisos e comunicados da igreja" },
];

const menuSections: MenuSection[] = [
  {
    label: "Nossa Comunidade",
    items: [
      { label: "Diretorio", href: "/diretorio", icon: BookOpen, permission: "diretorio:read", modulo: "diretorio", tooltip: "Contatos e aniversarios dos membros" },
      { label: "Pedidos de Oracao", href: "/pedidos-oracao", icon: HandHeart, permission: "pedidos_oracao:read", modulo: "pedidos-oracao", tooltip: "Compartilhe e ore pelos pedidos da igreja" },
      { label: "Calendario", href: "/calendario", icon: CalendarDays, permission: "calendario:read", modulo: "calendario", tooltip: "Eventos e calendario da igreja" },
      { label: "Escalas", href: "/escalas", icon: CalendarCheck, permission: null, modulo: "escalas", tooltip: "Veja sua escala e marque disponibilidade" },
      { label: "Salas", href: "/salas", icon: DoorOpen, permission: "salas:read", modulo: "salas", tooltip: "Reserve salas da igreja" },
    ],
  },
  {
    label: "Gestao",
    items: [
      { label: "Ministerios", href: "/ministerios", icon: Users, permission: "ministerios:read", modulo: "ministerios", tooltip: "Ministerios e equipes da igreja" },
      { label: "Pequenos Grupos", href: "/pequenos-grupos", icon: UsersRound, permission: "pequenos_grupos:read", modulo: "pequenos-grupos", tooltip: "Grupos de estudo e comunhao" },
      { label: "Pastoreio", href: "/pastoreio", icon: Heart, permission: "pastoreio:read", modulo: "pastoreio", tooltip: "Visitas pastorais e acompanhamento" },
      { label: "Educacional", href: "/educacional", icon: Baby, permission: "educacional:read", modulo: "educacional", tooltip: "Turmas e criancas do educacional infantil" },
      { label: "Membros", href: "/membros", icon: Users, permission: "membros:read", modulo: "membros", tooltip: "Cadastro e gestao da membresia" },
    ],
  },
];

const adminItems: MenuItem[] = [
  { label: "Gravações", href: "/admin/gravacoes", icon: Mic, permission: null, tooltip: "Gerenciar gravações e processamento IA" },
  { label: "Permissões", href: "/admin/permissoes", icon: Shield, permission: null, tooltip: "Controle de acesso e convites" },
  { label: "Modulos", href: "/admin/modulos", icon: LayoutGrid, permission: null, tooltip: "Ativar ou desativar funcionalidades" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { can, isAdmin, name, role, foto } = useAuth();
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
    (pathname === href || (href !== "/dashboard" && pathname.startsWith(href)));

  const isAdminActive = (href: string) =>
    href.startsWith("/admin")
      ? pathname.startsWith(href)
      : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const isCultoActive = cultoSubItems.some((item) => isActive(item.href));
  const visibleCultoSubItems = cultoSubItems.filter(isItemVisible);
  const showCultoMenu = visibleCultoSubItems.length > 0;

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
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                        <Link href="/dashboard">
                          <Home className="h-4 w-4" />
                          <span>Início</span>
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
            // Na secao Gestao, inclui o menu Cultos se visivel
            const isGestao = section.label === "Gestao";
            if (visibleItems.length === 0 && !(isGestao && showCultoMenu)) return null;
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Menu Cultos com submenu (apenas na secao Gestao) */}
                    {isGestao && showCultoMenu && (
                      <Collapsible defaultOpen={isCultoActive} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={isCultoActive}>
                              <Church className="h-4 w-4" />
                              <span>Cultos</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {visibleCultoSubItems.map((item) => (
                                <SidebarMenuSubItem key={item.href}>
                                  <SidebarMenuSubButton asChild isActive={isActive(item.href)}>
                                    <Link href={item.href}>
                                      <span>{item.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )}

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
            {foto && <AvatarImage src={foto} alt={name || "Usuário"} />}
            <AvatarFallback>
              {name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name || "Usuário"}</p>
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
