import type { Metadata } from "next";
import Link from "next/link";
import {
  getAvisosVigentes,
  getAgendaPublic,
  getInscricoesAtivas,
} from "@features/site-publico/lib/data";
import { AvisoCard } from "@features/site-publico/components/AvisoCard";

export const metadata: Metadata = {
  title: "Igreja Presbiteriana do Caminho — São Paulo",
  description:
    "Cultos, agenda da semana e inscrições da Igreja Presbiteriana do Caminho. Domingos, 10h, em Vila Mariana, São Paulo.",
};

// Conteúdo da semana muda com frequência moderada — revalida a cada 5 min.
export const revalidate = 300;

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatCulto(data: string, horario?: string): string {
  const d = new Date(`${data}T12:00:00`);
  const [, m, dia] = data.split("-");
  const base = Number.isNaN(d.getTime()) ? data : `${DIAS[d.getDay()]} ${dia}/${m}`;
  return horario ? `${base} · ${horario}` : base;
}

export default async function HomePage() {
  const [avisos, agenda, inscricoes] = await Promise.all([
    getAvisosVigentes(4),
    getAgendaPublic(),
    getInscricoesAtivas(),
  ]);
  const proximoCulto = agenda.find((e) => e.tipo === "culto");
  const numInscricoes = inscricoes.length;

  return (
    <div className="site-v2">
      {/* =========================== HERO =========================== */}
      <section className="hub-hero">
        <div className="wrap-wide">
          <p className="eyebrow">Igreja Presbiteriana do Caminho · São Paulo</p>
          <h1>Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo.</h1>
          <p className="sub">Presbiteriana. Pequena por escolha. No centro de São Paulo.</p>
          {proximoCulto && (
            <p className="culto-line">
              <strong>Próximo culto</strong> · {formatCulto(proximoCulto.data, proximoCulto.horario)}
            </p>
          )}
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

      {/* =========================== ATALHOS =========================== */}
      <section className="hub-section sunken">
        <div className="wrap-wide">
          <div className="atalhos">
            <Link href="/agenda" className="atalho">
              <span className="t">Agenda →</span>
              <span className="d">Cultos, PGs e eventos da comunidade.</span>
            </Link>
            <Link href="/inscricoes" className="atalho">
              <span className="t">
                Inscrições →
                {numInscricoes > 0 && <span className="badge">{numInscricoes} aberta{numInscricoes > 1 ? "s" : ""}</span>}
              </span>
              <span className="d">Retiros, cursos e atividades.</span>
            </Link>
            <Link href="/visite" className="atalho">
              <span className="t">Visite →</span>
              <span className="d">Endereço, horário e o que esperar.</span>
            </Link>
            <Link href="/quem-somos" className="atalho">
              <span className="t">Quem somos →</span>
              <span className="d">O que cremos e como vivemos.</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
