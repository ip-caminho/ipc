"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTheme } from "next-themes";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { LogOut, Globe, User, ClipboardList, Moon, Sun, ChevronsUpDown } from "lucide-react";
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
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
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

          {visibleSections.map((section) => (
            <SidebarGroup key={section.titulo}>
              <SidebarGroupLabel>{section.titulo}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
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
          ))}
        </TooltipProvider>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        {/* Menu do usuario: perfil, inscricoes, tema, ver o site, sair.
            Unico no desktop — o antigo dropdown do canto superior direito
            (UserMenu) foi removido. No mobile, o menu vive no MoreSheet. */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    {foto && <AvatarImage src={foto} alt={name || "Usuario"} />}
                    <AvatarFallback>
                      {name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left leading-tight">
                    <p className="text-sm font-medium truncate">{name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground truncate">{role || ""}</p>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{name || "Usuario"}</span>
                  {role && (
                    <span className="truncate text-xs text-muted-foreground font-normal">
                      {role}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/meu-perfil" className="cursor-pointer">
                    <User className="size-4" />
                    Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/minhas-inscricoes" className="cursor-pointer">
                    <ClipboardList className="size-4" />
                    Minhas inscrições
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="cursor-pointer"
                >
                  {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  Tema {isDark ? "claro" : "escuro"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  {/* Site publico em nova aba (nao perde o estado do sistema) */}
                  <a href="/?site=1" target="_blank" rel="noopener" className="cursor-pointer">
                    <Globe className="size-4" />
                    Ver o site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut()}
                  className="cursor-pointer"
                >
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
