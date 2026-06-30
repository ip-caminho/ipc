import type { Metadata } from "next";
import Link from "next/link";
import { getInscricaoBySlug } from "@features/site-publico/lib/data";
import { InscricaoForm } from "@features/site-publico/components/InscricaoForm";

// Vagas mudam — cache curto.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const insc = await getInscricaoBySlug(slug);
  if (!insc) return { title: "Inscrição — IPC" };
  return {
    title: `${insc.titulo} — Inscrições — IPC`,
    description: insc.descricao?.slice(0, 160),
  };
}

export default async function InscricaoSlugPage({ params }: Props) {
  const { slug } = await params;
  const insc = await getInscricaoBySlug(slug);

  if (!insc) {
    return (
      <div className="site-v2">
        <section className="hub-section">
          <div className="wrap" style={{ maxWidth: "640px", textAlign: "center" }}>
            <h1 className="page-intro" style={{ padding: 0 }}>
              Inscrição não encontrada
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: "var(--space-4)" }}>
              Esta inscrição não existe ou já foi encerrada.
            </p>
            <Link href="/inscricoes" className="link-quiet" style={{ marginTop: "var(--space-6)", display: "inline-block" }}>
              ← Ver inscrições abertas
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
          <Link href="/inscricoes" className="link-quiet">
            ← Inscrições
          </Link>
          <div className="page-intro" style={{ paddingTop: "var(--space-4)", paddingBottom: 0 }}>
            <h1>{insc.titulo}</h1>
          </div>
          {insc.descricao && (
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
              {insc.descricao}
            </div>
          )}

          <div style={{ marginTop: "var(--space-10)" }}>
            <InscricaoForm inscricao={insc} />
          </div>
        </div>
      </section>
    </div>
  );
}
