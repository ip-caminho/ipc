import { Spectral, Source_Sans_3 } from "next/font/google";
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

// Layout standalone (sem SiteHeader/SiteFooter): a inscricao do retiro (e a
// tela de confirmacao, mesma rota) nao deve dar acesso ao resto do site
// publico durante o fluxo. Mesmas fontes + landing.css do (site)/layout.tsx
// (escopadas em .site-v2), so sem o chrome.
export default function RetiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${spectral.variable} ${sourceSans.variable} min-h-dvh bg-[#FAF8F4] font-[family-name:var(--font-source-sans)] text-[#1A1A1A]`}
    >
      {children}
    </div>
  );
}
