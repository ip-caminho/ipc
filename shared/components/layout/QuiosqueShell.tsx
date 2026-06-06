"use client";

import { LogOut } from "lucide-react";
import { Logo } from "@shared/components/layout/Logo";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/shared/components/ui/button";
import { SermoesQuiosqueView } from "@features/gravacoes/components/SermoesQuiosqueView";

export function QuiosqueShell() {
  const { signOut } = useAuthActions();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Logo className="h-6" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Sair
        </Button>
      </header>

      <main className="flex-1">
        <SermoesQuiosqueView />
      </main>
    </div>
  );
}
