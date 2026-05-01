"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthGuard } from "@shared/components/auth/AuthGuard";
import { AppSidebar } from "@shared/components/layout/AppSidebar";
import { Header } from "@shared/components/layout/Header";
import { FloatingBottomBar } from "@shared/components/layout/FloatingBottomBar";
import { DevContext } from "@shared/components/layout/DevContext";
import { QuiosqueShell } from "@shared/components/layout/QuiosqueShell";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { AudioPlayerProvider } from "@shared/audio/AudioPlayerProvider";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { PlayerAwareMain } from "@shared/audio/PlayerAwareMain";
import { useAuth } from "@shared/providers/PermissionsProvider";

function ReadyShell({ children }: { children: React.ReactNode }) {
  // @ts-ignore Convex TS2589
  const config = useQuery(api.appConfig.queries.get);
  const { role, isLoading } = useAuth();

  // Aguarda role + config carregarem antes de decidir o shell.
  if (isLoading || config === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (config?.modoQuiosque && role !== "admin") {
    return <QuiosqueShell />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <PlayerAwareMain>{children}</PlayerAwareMain>
        <div className="hidden md:block sticky bottom-0 z-30">
          <GlobalAudioPlayer />
        </div>
      </SidebarInset>
      <FloatingBottomBar />
      <DevContext />
    </SidebarProvider>
  );
}

export default function ReadyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AudioPlayerProvider>
        <ReadyShell>{children}</ReadyShell>
      </AudioPlayerProvider>
    </AuthGuard>
  );
}
