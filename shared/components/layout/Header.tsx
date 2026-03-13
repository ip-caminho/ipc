"use client";

import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Separator } from "@/shared/components/ui/separator";
import Link from "next/link";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";

export function Header() {
  const { name } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1" />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/meu-perfil" className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">
              {name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm hidden sm:inline">
            {name || "Meu Perfil"}
          </span>
        </Link>
      </Button>
    </header>
  );
}
