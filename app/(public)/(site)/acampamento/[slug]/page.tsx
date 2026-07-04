import type { Metadata } from "next";
import Link from "next/link";
import { getAcampamentoBySlug } from "@features/acampamento/lib/data";
import { AcampamentoForm } from "@features/acampamento/components/AcampamentoForm";

// Disponibilidade de quartos muda — cache curto.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

function periodoBR(inicio: string, fim: string): string {
  const [iy, im, id] = inicio.split("-");
  const [fy, fm, fd] = fim.split("-");
  return `${id}/${im}/${iy} a ${fd}/${fm}/${fy}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const acamp = await getAcampamentoBySlug(slug);
  if (!acamp) return { title: "Acampamento — IPC" };
  return {
    title: `${acamp.titulo} — IPC`,
    description: acamp.descricao?.slice(0, 160),
  };
}

export default async function AcampamentoSlugPage({ params }: Props) {
  const { slug } = await params;
  const acamp = await getAcampamentoBySlug(slug);

  if (!acamp) {
    return (
      <div className="site-v2">
        <section className="hub-section">
          <div className="wrap" style={{ maxWidth: "640px", textAlign: "center" }}>
            <h1 className="page-intro" style={{ padding: 0 }}>
              Acampamento não encontrado
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: "var(--space-4)" }}>
              Esta página não existe ou as inscrições foram encerradas.
            </p>
            <Link
              href="/"
              className="link-quiet"
              style={{ marginTop: "var(--space-6)", display: "inline-block" }}
            >
              ← Voltar ao início
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="site-v2">
      <section className="hub-section">
        <div className="wrap" style={{ maxWidth: "680px" }}>
          <div className="page-intro" style={{ paddingBottom: 0 }}>
            <h1>{acamp.titulo}</h1>
          </div>
          <p style={{ color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
            {periodoBR(acamp.dataInicio, acamp.dataFim)}
          </p>
          {acamp.descricao && (
            <div
              style={{
                whiteSpace: "pre-line",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                lineHeight: "var(--leading-relaxed)",
                color: "var(--text-muted)",
                marginTop: "var(--space-4)",
              }}
            >
              {acamp.descricao}
            </div>
          )}

          <div style={{ marginTop: "var(--space-10)" }}>
            <AcampamentoForm acampamento={acamp} />
          </div>
        </div>
      </section>
    </div>
  );
}
