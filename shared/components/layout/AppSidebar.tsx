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
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  Users,
  UserCircle,
  BookOpen,
  Mic,
  Home,
  Shield,
  LogOut,
  Church,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";

const menuItems = [
  { label: "Inicio", href: "/", icon: Home, permission: null },
  {
    label: "Membros",
    href: "/membros",
    icon: Users,
    permission: "membros:read" as const,
  },
  {
    label: "Diretorio",
    href: "/diretorio",
    icon: BookOpen,
    permission: "diretorio:read" as const,
  },
  {
    label: "Entidades",
    href: "/entidades",
    icon: UserCircle,
    permission: "entidades:read" as const,
  },
  {
    label: "Gravacoes",
    href: "/gravacoes",
    icon: Mic,
    permission: "gravacoes:read" as const,
  },
];

const adminItems = [
  { label: "Gravacoes", href: "/admin/gravacoes", icon: Mic },
  { label: "Permissoes", href: "/admin/permissoes", icon: Shield },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { can, isAdmin, name, role } = useAuth();
  const { signOut } = useAuthActions();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Church className="h-6 w-6" />
          <span className="font-bold text-lg">IPC</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Skip items user doesn't have permission for (except null = everyone)
                if (item.permission && !can(item.permission)) return null;
                const isActive =
                  !pathname.startsWith("/admin") &&
                  (pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href)));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
