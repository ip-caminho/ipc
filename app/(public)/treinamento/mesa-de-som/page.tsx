import { Suspense } from "react";
import type { Metadata } from "next";
import { Archivo_Narrow, Barlow, Barlow_Condensed } from "next/font/google";
import { MesaSimulador } from "@features/mesaSom/components/MesaSimulador";

const legenda = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--fonte-legenda" });
const corpo = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--fonte-corpo" });
const painel = Archivo_Narrow({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--fonte-painel" });

export const metadata: Metadata = {
  title: "Treino da mesa de som — IPC",
  description: "Simulador da mesa de som da igreja para treinar voluntários.",
  robots: { index: false, follow: false },
};

export default function MesaDeSomPage() {
  return (
    <div className={`${legenda.variable} ${corpo.variable} ${painel.variable}`}>
      <Suspense>
        <MesaSimulador classeFontes={`${legenda.variable} ${corpo.variable} ${painel.variable}`} />
      </Suspense>
    </div>
  );
}
