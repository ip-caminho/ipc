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
    <div className="site-v2">
      {/* =========================== HERO =========================== */}
      <section className="hub-hero">
        <div className="wrap-wide">
          <p className="eyebrow">Igreja Presbiteriana do Caminho · São Paulo</p>
          <h1>Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo.</h1>
          <p className="sub">Presbiteriana. Pequena por escolha. No centro de São Paulo.</p>
          <div className="cta-row">
            <Link href="/visite" className="btn btn-primary">
              Quero conhecer →
            </Link>
            <Link href="/dashboard" className="link-quiet">
              Sou membro
            </Link>
          </div>
        </div>
      </section>

      {/* =========================== ESTA SEMANA =========================== */}
      {avisos.length > 0 && (
        <section className="hub-section tight">
          <div className="wrap-wide">
            <div className="hub-head">
              <h2>Esta semana</h2>
            </div>
            <div className="grid-avisos">
              {avisos.map((a) => (
                <AvisoCard key={a._id} aviso={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================== PRÓXIMOS EVENTOS =========================== */}
      {proximos.length > 0 && (
        <section className="hub-section tight">
          <div className="wrap-wide">
            <div className="hub-head">
              <h2>Próximos eventos</h2>
              <Link href="/agenda" className="link-quiet">
                Agenda completa →
              </Link>
            </div>
            <div>
              {proximos.map((e) => (
                <EventoLinha key={e.id} evento={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================== SOBRE + INSCRIÇÕES =========================== */}
      <section className="hub-section sunken">
        <div className="wrap-wide two-col">
          <div>
            <p className="eyebrow">Sobre nós</p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-base)",
                lineHeight: "var(--leading-normal)",
                color: "var(--text-strong)",
                maxWidth: "42ch",
                margin: "var(--space-4) 0 0",
              }}
            >
              Somos uma comunidade aprendendo, junto, a se parecer com Cristo — começando pela
              segunda-feira.
            </p>
            <Link href="/quem-somos" className="link-quiet" style={{ marginTop: "var(--space-5)", display: "inline-block" }}>
              Conheça nossa comunidade →
            </Link>
          </div>

          {inscricoesTop.length > 0 && (
            <div>
              <p className="eyebrow">Inscrições abertas</p>
              <div className="stack" style={{ marginTop: "var(--space-4)" }}>
                {inscricoesTop.map((insc) => (
                  <InscricaoCard key={insc._id} inscricao={insc} compact />
                ))}
              </div>
              <Link href="/inscricoes" className="link-quiet" style={{ marginTop: "var(--space-4)", display: "inline-block" }}>
                Ver todas →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
