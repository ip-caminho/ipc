"use client";

import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { UserMenu } from "./UserMenu";

export function Header() {
  return (
    <>
      <header className="flex md:hidden sticky top-0 z-40 h-12 shrink-0 items-center justify-end bg-background px-4">
        <UserMenu />
      </header>

      <header className="hidden md:flex sticky top-0 z-40 h-12 shrink-0 items-center border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
    </>
  );
}
