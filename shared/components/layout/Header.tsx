"use client";

import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { UserMenu } from "./UserMenu";
import { usePageTitle } from "@shared/providers/PageTitleProvider";

export function Header() {
  const title = usePageTitle();

  return (
    <>
      <header className="flex md:hidden sticky top-0 z-40 h-12 shrink-0 items-center justify-between gap-2 bg-background px-4">
        <h1 className="min-w-0 truncate font-display text-xl font-semibold leading-tight">
          {title ?? ""}
        </h1>
        <UserMenu />
      </header>

      <header className="hidden md:flex sticky top-0 z-40 h-12 shrink-0 items-center border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
    </>
  );
}
