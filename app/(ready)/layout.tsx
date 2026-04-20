import { AuthGuard } from "@shared/components/auth/AuthGuard";
import { AppSidebar } from "@shared/components/layout/AppSidebar";
import { Header } from "@shared/components/layout/Header";
import { MobileHeader } from "@shared/components/layout/MobileHeader";
import { MobileTabBar } from "@shared/components/layout/MobileTabBar";
import { DevContext } from "@shared/components/layout/DevContext";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { AudioPlayerProvider } from "@shared/audio/AudioPlayerProvider";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { MobileAudioPlayer } from "@shared/audio/MobileAudioPlayer";
import { PlayerAwareMain } from "@shared/audio/PlayerAwareMain";

export default function ReadyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider className="h-dvh !min-h-0">
        <AudioPlayerProvider>
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            <MobileHeader />
            <Header />
            <PlayerAwareMain>
              {children}
            </PlayerAwareMain>
            <div className="hidden md:block">
              <GlobalAudioPlayer />
            </div>
          </SidebarInset>
          <MobileAudioPlayer />
          <MobileTabBar />
          <DevContext />
        </AudioPlayerProvider>
      </SidebarProvider>
    </AuthGuard>
  );
}
