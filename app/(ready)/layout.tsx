import { AuthGuard } from "@shared/components/auth/AuthGuard";
import { AppSidebar } from "@shared/components/layout/AppSidebar";
import { Header } from "@shared/components/layout/Header";
import { DevContext } from "@shared/components/layout/DevContext";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";

export default function ReadyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider className="h-dvh !min-h-0">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
        <DevContext />
      </SidebarProvider>
    </AuthGuard>
  );
}
