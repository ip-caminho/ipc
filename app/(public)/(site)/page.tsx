import type { Metadata } from "next";
import Link from "next/link";
import {
  getAvisosUltimoCulto,
  getAgendaPublic,
  getInscricoesAtivas,
  getRetirosAtivos,
  getTurmasAbertas,
  getTextosSitePublic,
} from "@features/site-publico/lib/data";
import { AvisoCard } from "@features/site-publico/components/AvisoCard";
import { InscricaoCard } from "@features/site-publico/components/InscricaoCard";
import { RetiroCard } from "@features/site-publico/components/RetiroCard";
import { TurmaCardPublico } from "@features/site-publico/components/TurmaCardPublico";
import { CultoCountdown } from "@features/site-publico/components/CultoCountdown";
import { SITE_TEXTOS_DEFAULTS } from "@features/site-publico/lib/igreja";

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
  const [avisosCulto, agenda, inscricoes, retiros, turmas, textos] = await Promise.all([
    getAvisosUltimoCulto(),
    getAgendaPublic(),
    getInscricoesAtivas(),
    getRetirosAtivos(),
    getTurmasAbertas(),
    getTextosSitePublic(),
  ]);
  const heroTitulo = textos.heroTitulo || SITE_TEXTOS_DEFAULTS.heroTitulo;
  const heroSub = textos.heroSub || SITE_TEXTOS_DEFAULTS.heroSub;
  const proximoCulto = agenda.find((e) => e.tipo === "culto");
  const numInscricoes = inscricoes.length + retiros.length + turmas.length;
  const temAvisos = !!avisosCulto && avisosCulto.avisos.length > 0;
  // Agenda resumida no hero: o próximo culto UMA vez + eventos especiais. O
  // culto dominical é gerado pra 12 domingos (id "culto-*"); mostrá-los todos
  // deixaria a lista repetitiva, já que há poucos eventos. Cultos reais
  // publicados (id do banco) continuam aparecendo.
  const proximosEventos = agenda
    .filter((e) => e === proximoCulto || !e.id.startsWith("culto-"))
    .slice(0, 5);
  const temAgenda = proximosEventos.length > 0;

  return (
    <div className="site-v2">
      {/* =========================== HERO =========================== */}
      <section className="hub-hero">
        <div className="wrap-wide hub-hero-grid" data-has-aside={temAgenda}>
          <div className="hub-hero-main">
            <p className="eyebrow">Igreja Presbiteriana do Caminho · São Paulo</p>
            <h1>{heroTitulo}</h1>
            <p className="sub">{heroSub}</p>
            {proximoCulto && (
              <CultoCountdown
                data={proximoCulto.data}
                horario={proximoCulto.horario}
                label={formatCulto(proximoCulto.data, proximoCulto.horario)}
              />
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

          {/* Agenda resumida — coluna direita no desktop, empilha no mobile */}
          {temAgenda && (
            <aside className="hub-hero-aside">
              <div className="hub-head">
                <h2>Agenda</h2>
                <Link href="/agenda" className="aside-link">
                  Ver tudo →
                </Link>
              </div>
              <ul className="hero-agenda">
                {proximosEventos.map((e) => (
                  <li key={e.id} className="ha-item">
                    <span className="ha-quando">
                      {formatCulto(e.data, e.horario)}
                    </span>
                    <span className="ha-titulo">{e.titulo}</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>

      {/* =========================== ATALHOS =========================== */}
      <section className="hub-section sunken">
        <div className="wrap-wide">
          <div className="atalhos">
            <Link href="/quem-somos" className="atalho">
              <span className="t">Quem somos →</span>
              <span className="d">O que cremos e como vivemos.</span>
            </Link>
            <Link href="/agenda" className="atalho">
              <span className="t">Agenda →</span>
              <span className="d">Cultos, PGs e eventos da comunidade.</span>
            </Link>
            <Link href="/visite" className="atalho">
              <span className="t">Visite →</span>
              <span className="d">Endereço, horário e o que esperar.</span>
            </Link>
            <Link href="/inscricoes" className="atalho">
              <span className="t">
                Inscrições →
                {numInscricoes > 0 && <span className="badge">{numInscricoes} aberta{numInscricoes > 1 ? "s" : ""}</span>}
              </span>
              <span className="d">Retiros, cursos e atividades.</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== INSCRIÇÕES ABERTAS ===================== */}
      {/* A home so tinha o contador no atalho; quem abre uma inscricao queria
          ve-la aqui. Compacto: titulo e a linha de datas, o detalhe fica no hub. */}
      {numInscricoes > 0 && (
        <section className="hub-section tight">
          <div className="wrap-wide">
            <div className="hub-head">
              <h2>Inscrições abertas</h2>
              <Link href="/inscricoes" className="aside">
                Ver todas →
              </Link>
            </div>
            <div className="grid-insc">
              {turmas.map((t) => (
                <TurmaCardPublico key={t._id} turma={t} compact />
              ))}
              {retiros.map((r) => (
                <RetiroCard key={r._id} retiro={r} />
              ))}
              {inscricoes.map((insc) => (
                <InscricaoCard key={insc._id} inscricao={insc} compact />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== AVISOS DO ÚLTIMO CULTO ===================== */}
      {temAvisos && (
        <section className="hub-section tight">
          <div className="wrap-wide">
            <div className="hub-head">
              <h2>Avisos do último culto</h2>
              <span className="aside">Domingo · {formatCulto(avisosCulto!.data)}</span>
            </div>
            <div className="grid-avisos">
              {avisosCulto!.avisos.map((a, i) => (
                <AvisoCard key={i} aviso={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
