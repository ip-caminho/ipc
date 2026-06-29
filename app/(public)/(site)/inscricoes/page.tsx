import type { Metadata } from "next";
import { getInscricoesAtivas } from "@features/site-publico/lib/data";
import { InscricaoCard } from "@features/site-publico/components/InscricaoCard";

export const metadata: Metadata = {
  title: "Inscrições — IPC",
  description:
    "Inscrições abertas para eventos, retiros e atividades da Igreja Presbiteriana do Caminho.",
};

export const revalidate = 300;

export default async function InscricoesPage() {
  const inscricoes = await getInscricoesAtivas();

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
        Igreja Presbiteriana do Caminho · São Paulo
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-spectral)] text-[34px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[40px]">
        Inscrições
      </h1>
      <p className="mt-4 max-w-[480px] font-[family-name:var(--font-spectral)] text-[16px] italic text-[#595959]">
        Retiros, cursos e atividades com inscrição aberta.
      </p>

      <div className="mt-10">
        {inscricoes.length === 0 ? (
          <p className="border border-dashed border-[#E5E3DC] px-6 py-12 text-center font-[family-name:var(--font-source-sans)] text-[14px] text-[#595959]">
            Não há inscrições abertas no momento. As próximas serão publicadas aqui.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inscricoes.map((insc) => (
              <InscricaoCard key={insc._id} inscricao={insc} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
