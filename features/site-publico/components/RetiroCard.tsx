import Link from "next/link";
import type { RetiroPublicoLista } from "@convex/public/retiro";

// Formata o período "DD/MM – DD/MM/AAAA" a partir de datas YYYY-MM-DD.
// Extrai dia/mês da string (sem Date, evita deslize de fuso).
function periodo(inicio: string, fim: string): string | null {
  const p = (d: string) => {
    const [ano, mes, dia] = d.split("-");
    return { ano, mes, dia };
  };
  const a = p(inicio);
  const b = p(fim);
  if (!a.dia || !b.dia) return null;
  if (inicio === fim) return `${a.dia}/${a.mes}/${a.ano}`;
  return `${a.dia}/${a.mes} – ${b.dia}/${b.mes}/${b.ano}`;
}

// Card de retiro no hub /inscricoes. Mesmo estilo do InscricaoCard, mas linka
// para /retiro/[slug] (sistema separado das inscrições genéricas).
export function RetiroCard({ retiro }: { retiro: RetiroPublicoLista }) {
  const quando = periodo(retiro.dataInicio, retiro.dataFim);
  return (
    <Link href={`/retiro/${retiro.slug}`} className="insc-card">
      <h3>{retiro.titulo}</h3>
      {retiro.descricao && <p className="desc">{retiro.descricao}</p>}
      {quando && <p className="meta">{quando}</p>}
      <span className="go">Inscrever-se →</span>
    </Link>
  );
}
