import { Spectral, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@features/site-publico/components/SiteHeader";
import { SiteFooter } from "@features/site-publico/components/SiteFooter";
import "../landing.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-sans",
  display: "swap",
});

// Chrome público compartilhado (header/footer da identidade da landing).
// landing.css é escopada em .site-v2 — só estiliza o chrome e o /quem-somos;
// o corpo das páginas funcionais NÃO entra em .site-v2 (Fase 1: só chrome).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="topo"
      className={`${spectral.variable} ${sourceSans.variable} flex min-h-dvh flex-col bg-[#FAF8F4] font-[family-name:var(--font-source-sans)] text-[#1A1A1A]`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-[#1A1A1A] focus:bg-[#FAFAF7] focus:px-4 focus:py-2 focus:text-[13px]"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
