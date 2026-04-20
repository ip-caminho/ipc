"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuthActions } from "@convex-dev/auth/react";
import { Church, LogOut, Moon, Sun, User } from "lucide-react";

import { useAuth } from "@shared/providers/PermissionsProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export function MobileHeader() {
  const { name, role, foto } = useAuth();
  const { signOut } = useAuthActions();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 h-14 pt-safe">
      <Link href="/dashboard" className="flex items-center gap-2 min-h-11">
        <Church className="h-5 w-5" aria-hidden />
        <span className="font-bold text-base">IPC</span>
      </Link>
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center justify-center rounded-full min-h-11 min-w-11 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-9 w-9">
            {foto && <AvatarImage src={foto} alt={name || "Usuário"} />}
            <AvatarFallback className="text-xs">
              {name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{name || "Usuário"}</span>
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
          <DropdownMenuItem
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="cursor-pointer"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Tema {isDark ? "claro" : "escuro"}
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
    </header>
  );
}
