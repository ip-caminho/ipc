import Link from "next/link";
import type { InscricaoEventoPublica } from "@convex/public/inscricoesEvento";

function formatData(ts?: number): string | null {
  if (ts == null) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// "Até DD/MM/AAAA · N vagas" / "Lista de espera". Campos ausentes são omitidos.
function meta(insc: InscricaoEventoPublica): string {
  const partes: string[] = [];
  const limite = formatData(insc.dataLimite);
  if (limite) partes.push(`Até ${limite}`);
  if (insc.vagas != null) {
    const restantes = insc.vagas - insc.vagasOcupadas;
    partes.push(restantes > 0 ? `${restantes} vagas` : "Lista de espera");
  }
  return partes.join(" · ");
}

// Card de inscrição (estilo .site-v2). Card inteiro é link p/ /inscricoes/[slug].
// `compact` (home): sem descrição nem "Inscrever-se".
export function InscricaoCard({
  inscricao,
  compact = false,
}: {
  inscricao: InscricaoEventoPublica;
  compact?: boolean;
}) {
  const linha = meta(inscricao);
  return (
    <Link href={`/inscricoes/${inscricao.slug}`} className="insc-card">
      <h3>{inscricao.titulo}</h3>
      {!compact && inscricao.descricao && <p className="desc">{inscricao.descricao}</p>}
      {linha && <p className="meta">{linha}</p>}
      {!compact && <span className="go">Inscrever-se →</span>}
    </Link>
  );
}
