import Link from "next/link";
import type { TurmaPublica } from "@convex/public/turmas";

const DIAS: Record<string, string> = {
  DOMINGO: "Domingos",
  SEGUNDA: "Segundas",
  TERCA: "Terças",
  QUARTA: "Quartas",
  QUINTA: "Quintas",
  SEXTA: "Sextas",
  SABADO: "Sábados",
};

function formatData(iso?: string): string | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : null;
}

/** "Domingos 08h30 · começa 20/09 · inscrições até 13/09". */
function meta(turma: TurmaPublica): string {
  const partes: string[] = [];
  const quando = [turma.diaSemana ? DIAS[turma.diaSemana] : null, turma.horario]
    .filter(Boolean)
    .join(" ");
  if (quando) partes.push(quando);

  const inicio = formatData(turma.dataInicio);
  if (inicio) partes.push(`começa ${inicio}`);

  const ate = formatData(turma.inscricoesAte);
  if (ate) partes.push(`inscrições até ${ate}`);

  if (turma.vagasRestantes != null) {
    partes.push(turma.vagasRestantes > 0 ? `${turma.vagasRestantes} vagas` : "lista de espera");
  }
  return partes.join(" · ");
}

// Mesmo formato do InscricaoCard, mas aponta para /inscricao/[token]: turma nao
// tem slug, e o token E o endereco do formulario.
export function TurmaCardPublico({
  turma,
  compact = false,
}: {
  turma: TurmaPublica;
  compact?: boolean;
}) {
  const linha = meta(turma);
  return (
    <Link href={`/inscricao/${turma.token}`} className="insc-card">
      <h3>{turma.nome}</h3>
      {linha && <p className="meta">{linha}</p>}
      {!compact && <span className="go">Inscrever-se →</span>}
    </Link>
  );
}
