"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthGuard } from "@shared/components/auth/AuthGuard";
import { AppSidebar } from "@shared/components/layout/AppSidebar";
import { Header } from "@shared/components/layout/Header";
import { FloatingBottomBar } from "@shared/components/layout/FloatingBottomBar";
import { DevContext } from "@shared/components/layout/DevContext";
import { QuiosqueShell } from "@shared/components/layout/QuiosqueShell";
import { ErrorBoundary } from "@shared/components/ErrorBoundary";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { AudioPlayerProvider } from "@shared/audio/AudioPlayerProvider";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { PlayerAwareMain } from "@shared/audio/PlayerAwareMain";
import { useAuth } from "@shared/providers/PermissionsProvider";

function NormalShell({ children }: { children: React.ReactNode }) {
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

function ShellSelector({ children }: { children: React.ReactNode }) {
  // @ts-ignore Convex TS2589
  const config = useQuery(api.appConfig.queries.get);
  const { role, isLoading } = useAuth();

  // Enquanto config ou role nao carregaram, renderiza o layout normal
  // (sem branching). Evita flash de loader e nao bloqueia paginas que
  // nao dependem do modo quiosque.
  if (isLoading || config === undefined) {
    return <NormalShell>{children}</NormalShell>;
  }

  if (config?.modoQuiosque && role !== "admin") {
    return <QuiosqueShell />;
  }

  return <NormalShell>{children}</NormalShell>;
}

export default function ReadyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AudioPlayerProvider>
        <ErrorBoundary fallback={<NormalShell>{children}</NormalShell>}>
          <ShellSelector>{children}</ShellSelector>
        </ErrorBoundary>
      </AudioPlayerProvider>
    </AuthGuard>
  );
}
