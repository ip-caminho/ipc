import type { Metadata } from "next";
import { getInscricoesAtivas, getRetirosAtivos } from "@features/site-publico/lib/data";
import { InscricaoCard } from "@features/site-publico/components/InscricaoCard";
import { RetiroCard } from "@features/site-publico/components/RetiroCard";

export const metadata: Metadata = {
  title: "Inscrições — IPC",
  description:
    "Inscrições abertas para eventos, retiros e atividades da Igreja Presbiteriana do Caminho.",
};

export const revalidate = 300;

export default async function InscricoesPage() {
  const [inscricoes, retiros] = await Promise.all([
    getInscricoesAtivas(),
    getRetirosAtivos(),
  ]);
  const vazio = inscricoes.length === 0 && retiros.length === 0;

  return (
    <div className="site-v2">
      <section className="hub-section">
        <div className="wrap">
          <div className="page-intro" style={{ padding: 0 }}>
            <p className="eyebrow">Igreja Presbiteriana do Caminho · São Paulo</p>
            <h1>Inscrições</h1>
            <p className="sub">Retiros, cursos e atividades com inscrição aberta.</p>
          </div>

          <div style={{ marginTop: "var(--space-10)" }}>
            {vazio ? (
              <p className="empty">
                Não há inscrições abertas no momento. As próximas serão publicadas aqui.
              </p>
            ) : (
              <div className="grid-insc">
                {retiros.map((r) => (
                  <RetiroCard key={r._id} retiro={r} />
                ))}
                {inscricoes.map((insc) => (
                  <InscricaoCard key={insc._id} inscricao={insc} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
