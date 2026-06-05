"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
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
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/shared/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Church, LogOut, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { useNavigationMode } from "@shared/providers/NavigationModeProvider";
import {
  PRIMARY_TABS,
  BOLETIM_TAB,
  ROL_TAB,
  GESTAO_SECTIONS,
  ELEVATED_ROLES,
  isDomingoWindow,
  type NavItem,
} from "@shared/constants/navigation";

function useIsItemVisible() {
  const { can } = useAuth();
  // @ts-ignore Convex TS2589
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);

  return (item: NavItem): boolean => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) {
      return false;
    }
    if (item.permission && !can(item.permission)) {
      return false;
    }
    return true;
  };
}

export function AppSidebar() {
  const pathname = usePathname();
  const { name, role, foto, hasAnyRole } = useAuth();
  const { signOut } = useAuthActions();
  const { mode, setMode, canToggle, isAdminMode } = useNavigationMode();
  const isItemVisible = useIsItemVisible();
  const [isBoletim, setIsBoletim] = useState(false);

  useEffect(() => {
    setIsBoletim(isDomingoWindow());
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const primaryItems: NavItem[] = [
    ...PRIMARY_TABS,
    ...(isBoletim ? [BOLETIM_TAB] : []),
    // Rol de Membros no nivel primario para quem tem rol:read (ex.: membro
    // com permissao individual). No modo admin sai daqui — ja esta no grupo
    // de gestao "Pessoas" (evita duplicar).
    ...(!isAdminMode ? [ROL_TAB] : []),
  ].filter(isItemVisible);

  // Secoes colapsaveis aparecem so no modo admin (Gestao). No modo membro,
  // a navegacao fica nas tabs primarias (Inicio, Gravacoes, Orar).
  const visibleSections = (isAdminMode ? GESTAO_SECTIONS : [])
    .map((section) => ({
      ...section,
      items: section.items.filter(isItemVisible),
    }))
    .filter((section) => section.items.length > 0);

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
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryItems.map((item) => (
                  <SidebarMenuItem key={item.href + item.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive(item.href)}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {visibleSections.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Gestão</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleSections.map((section) => {
                    const sectionActive = section.items.some((item) =>
                      isActive(item.href)
                    );
                    return (
                      <Collapsible
                        key={section.titulo}
                        defaultOpen={sectionActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={sectionActive}>
                              <span>{section.titulo}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {section.items.map((item) => (
                                <SidebarMenuSubItem key={item.href + item.label}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(item.href)}
                                  >
                                    <Link href={item.href}>
                                      <item.icon className="h-4 w-4" />
                                      <span>{item.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </TooltipProvider>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-3">
        {canToggle && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Modo admin</span>
            <Switch
              checked={mode === "admin"}
              onCheckedChange={(checked) => setMode(checked ? "admin" : "member")}
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {foto && <AvatarImage src={foto} alt={name || "Usuario"} />}
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
