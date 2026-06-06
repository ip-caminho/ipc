import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@shared/providers/ConvexClientProvider";
import { PermissionsProvider } from "@shared/providers/PermissionsProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IPC",
  description: "Igreja Presbiteriana do Caminho",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IPC",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Desativa o auto-zoom do iOS ao focar inputs (que "prendia" a pagina
  // ampliada). O pinch-zoom manual continua funcionando — iOS e Android
  // ignoram o limite para o gesto do usuario (acessibilidade preservada).
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <ConvexClientProvider>
              <PermissionsProvider>
                <NuqsAdapter>
                  {children}
                  <Toaster position="top-center" />
                </NuqsAdapter>
              </PermissionsProvider>
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
