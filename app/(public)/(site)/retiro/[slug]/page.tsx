import type { Metadata } from "next";
import Link from "next/link";
import { getRetiroBySlug } from "@features/retiro/lib/data";
import { RetiroPagina } from "@features/retiro/components/RetiroPagina";

// Disponibilidade de quartos muda — cache curto.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const acamp = await getRetiroBySlug(slug);
  if (!acamp) return { title: "Retiro — IPC" };
  return {
    title: `${acamp.titulo} — IPC`,
    description: acamp.descricao?.slice(0, 160),
  };
}

export default async function RetiroSlugPage({ params }: Props) {
  const { slug } = await params;
  const acamp = await getRetiroBySlug(slug);

  if (!acamp) {
    return (
      <div className="site-v2">
        <section className="hub-section">
          <div className="wrap" style={{ maxWidth: "640px", textAlign: "center" }}>
            <h1 className="page-intro" style={{ padding: 0 }}>
              Retiro não encontrado
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
          <RetiroPagina retiro={acamp} />
        </div>
      </section>
    </div>
  );
}
