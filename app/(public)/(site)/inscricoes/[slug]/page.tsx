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
      <section className="mx-auto max-w-2xl px-5 py-20 text-center md:px-8">
        <h1 className="font-[family-name:var(--font-spectral)] text-[28px] text-[#1A1A1A]">
          Inscrição não encontrada
        </h1>
        <p className="mt-4 font-[family-name:var(--font-source-sans)] text-[14px] text-[#595959]">
          Esta inscrição não existe ou já foi encerrada.
        </p>
        <Link
          href="/inscricoes"
          className="mt-6 inline-block font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A] underline underline-offset-4"
        >
          ← Ver inscrições abertas
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 md:px-8 md:py-20">
      <Link
        href="/inscricoes"
        className="font-[family-name:var(--font-source-sans)] text-[12px] text-[#595959] underline-offset-4 hover:underline"
      >
        ← Inscrições
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-spectral)] text-[30px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[36px]">
        {insc.titulo}
      </h1>
      {insc.descricao && (
        <div className="mt-4 whitespace-pre-line font-[family-name:var(--font-source-sans)] text-[15px] leading-[1.6] text-[#595959]">
          {insc.descricao}
        </div>
      )}

      <div className="mt-10">
        <InscricaoForm inscricao={insc} />
      </div>
    </section>
  );
}
