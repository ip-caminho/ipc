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
    <div className="site-v2">
      <section className="hub-section">
        <div className="wrap">
          <div className="page-intro" style={{ padding: 0 }}>
            <p className="eyebrow">Igreja Presbiteriana do Caminho · São Paulo</p>
            <h1>Agenda</h1>
            <p className="sub">Cultos, encontros e eventos da nossa comunidade.</p>
          </div>

          {/* useQueryState (nuqs) precisa de Suspense boundary */}
          <Suspense fallback={null}>
            <AgendaClient eventos={eventos} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
