"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { LogOut, ChevronRight } from "lucide-react";
import { Logo } from "@shared/components/layout/Logo";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  PRIMARY_TABS,
  GESTAO_SECTIONS,
  type NavItem,
} from "@shared/constants/navigation";

function useIsItemVisible() {
  const { can, hasAnyRole } = useAuth();
  // @ts-ignore Convex TS2589
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);

  return (item: NavItem): boolean => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) {
      return false;
    }
    if (item.permission && !can(item.permission)) {
      return false;
    }
    if (item.roles && !hasAnyRole(item.roles)) {
      return false;
    }
    return true;
  };
}

export function AppSidebar() {
  const pathname = usePathname();
  const { name, role, foto } = useAuth();
  const { signOut } = useAuthActions();
  const isItemVisible = useIsItemVisible();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const primaryItems: NavItem[] = [...PRIMARY_TABS].filter(isItemVisible);

  // Secoes colapsaveis filtradas por RBAC: um item aparece se can(permission)
  // (ou roles) e o modulo estiver ativo. Secao sem itens visiveis some.
  const visibleSections = GESTAO_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter(isItemVisible),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo className="h-8" />
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
