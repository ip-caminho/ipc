import { Spectral, Source_Sans_3 } from "next/font/google";
import { HeaderPublico } from "@features/site-publico/components/HeaderPublico";
import { FooterPublico } from "@features/site-publico/components/FooterPublico";
import { getIgrejaInfoPublic } from "@features/site-publico/lib/data";

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

// Footer puxa dados da igreja (raramente mudam) — ISR a cada 15 min.
export const revalidate = 900;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const igreja = await getIgrejaInfoPublic();

  return (
    <div
      id="topo"
      className={`${spectral.variable} ${sourceSans.variable} flex min-h-dvh flex-col bg-[#FAFAF7] font-[family-name:var(--font-source-sans)] text-[#1A1A1A]`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-[#1A1A1A] focus:bg-[#FAFAF7] focus:px-4 focus:py-2 focus:text-[13px]"
      >
        Pular para o conteúdo
      </a>
      <HeaderPublico />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <FooterPublico igreja={igreja} />
    </div>
  );
}
