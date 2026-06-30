import type { Metadata } from "next";
import Link from "next/link";
import {
  getAvisosVigentes,
  getAgendaPublic,
  getInscricoesAtivas,
} from "@features/site-publico/lib/data";
import { AvisoCard } from "@features/site-publico/components/AvisoCard";
import { EventoLinha } from "@features/site-publico/components/EventoLinha";
import { InscricaoCard } from "@features/site-publico/components/InscricaoCard";

export const metadata: Metadata = {
  title: "Igreja Presbiteriana do Caminho — São Paulo",
  description:
    "Cultos, agenda da semana e inscrições da Igreja Presbiteriana do Caminho. Domingos, 10h, em Vila Mariana, São Paulo.",
};

// Conteúdo da semana muda com frequência moderada — revalida a cada 5 min.
export const revalidate = 300;

export default async function HomePage() {
  const [avisos, agenda, inscricoes] = await Promise.all([
    getAvisosVigentes(4),
    getAgendaPublic(),
    getInscricoesAtivas(),
  ]);
  const proximos = agenda.slice(0, 4);
  const inscricoesTop = inscricoes.slice(0, 3);

  return (
    <>
      {/* =========================== HERO =========================== */}
      <section className="border-b border-[#E5E3DC] px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
            Igreja Presbiteriana do Caminho · São Paulo
          </p>
          <h1 className="mt-4 max-w-[620px] font-[family-name:var(--font-spectral)] text-[32px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[44px]">
            Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo.
          </h1>
          <p className="mt-5 max-w-[480px] font-[family-name:var(--font-spectral)] text-[16px] italic text-[#595959] md:text-[18px]">
            Presbiteriana. Pequena por escolha. No centro de São Paulo.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/visite"
              className="inline-flex h-11 items-center border border-[#1A1A1A] px-5 font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-[#FAFAF7]"
            >
              Quero conhecer →
            </Link>
            <Link
              href="/dashboard"
              className="border-b border-[#1A1A1A] pb-0.5 font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A]"
            >
              Sou membro
            </Link>
          </div>
        </div>
      </section>

      {/* =========================== ESTA SEMANA =========================== */}
      {avisos.length > 0 && (
        <section className="border-b border-[#E5E3DC] px-5 py-12 md:px-8 md:py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-[family-name:var(--font-spectral)] text-[22px] text-[#1A1A1A]">
              Esta semana
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {avisos.map((a) => (
                <AvisoCard key={a._id} aviso={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================== PRÓXIMOS EVENTOS =========================== */}
      {proximos.length > 0 && (
        <section className="border-b border-[#E5E3DC] px-5 py-12 md:px-8 md:py-14">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-baseline justify-between">
              <h2 className="font-[family-name:var(--font-spectral)] text-[22px] text-[#1A1A1A]">
                Próximos eventos
              </h2>
              <Link
                href="/agenda"
                className="font-[family-name:var(--font-source-sans)] text-[12px] text-[#595959] underline-offset-4 hover:text-[#1A1A1A] hover:underline"
              >
                Agenda completa →
              </Link>
            </div>
            <div className="mt-6">
              {proximos.map((e) => (
                <EventoLinha key={e.id} evento={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================== SOBRE + INSCRIÇÕES =========================== */}
      <section className="bg-[#F4F0E8] px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
              Sobre nós
            </p>
            <p className="mt-4 max-w-[400px] font-[family-name:var(--font-spectral)] text-[18px] leading-[1.5] text-[#1A1A1A]">
              Somos uma comunidade aprendendo, junto, a se parecer com Cristo — começando pela
              segunda-feira.
            </p>
            <Link
              href="/quem-somos"
              className="mt-5 inline-block border-b border-[#1A1A1A] pb-0.5 font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A]"
            >
              Conheça nossa comunidade →
            </Link>
          </div>

          {inscricoesTop.length > 0 && (
            <div>
              <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
                Inscrições abertas
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {inscricoesTop.map((insc) => (
                  <InscricaoCard key={insc._id} inscricao={insc} compact />
                ))}
              </div>
              <Link
                href="/inscricoes"
                className="mt-4 inline-block font-[family-name:var(--font-source-sans)] text-[12px] text-[#595959] underline-offset-4 hover:text-[#1A1A1A] hover:underline"
              >
                Ver todas →
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
