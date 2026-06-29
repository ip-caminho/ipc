import type { Metadata } from "next";
import { Suspense } from "react";
import { getAgendaPublic } from "@features/site-publico/lib/data";
import { AgendaClient } from "@features/site-publico/components/AgendaClient";

export const metadata: Metadata = {
  title: "Agenda — IPC",
  description: "Cultos, eventos e encontros da Igreja Presbiteriana do Caminho.",
};

// Agenda muda mais que a info da igreja, mas tolera 15 min de defasagem.
export const revalidate = 900;

export default async function AgendaPage() {
  const eventos = await getAgendaPublic();

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
        Igreja Presbiteriana do Caminho · São Paulo
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-spectral)] text-[34px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[40px]">
        Agenda
      </h1>
      <p className="mt-4 max-w-[480px] font-[family-name:var(--font-spectral)] text-[16px] italic text-[#595959]">
        Cultos, encontros e eventos da nossa comunidade.
      </p>

      {/* useQueryState (nuqs) precisa de Suspense boundary p/ leitura de searchParams */}
      <Suspense fallback={null}>
        <AgendaClient eventos={eventos} />
      </Suspense>
    </section>
  );
}
