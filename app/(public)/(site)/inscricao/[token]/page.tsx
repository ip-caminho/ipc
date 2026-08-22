import type { Metadata } from "next";
import { getTurmaPorToken } from "@features/site-publico/lib/data";
import { InscricaoPublicaForm } from "@features/turmas/components/InscricaoPublicaForm";
import { DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";

// A rota vive dentro de (site) para herdar cabeçalho e rodapé: quem chega pela
// home ou pelo hub precisa de caminho de volta. O corpo do formulário mantém o
// estilo do app (a convenção do layout é chrome compartilhado, corpo próprio).
export const revalidate = 60;

function formatData(iso?: string): string | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : null;
}

/** "Domingos 08:30 · início 20/09/2026 · inscrições até 13/09/2026". */
function resumo(turma: {
  diaSemana?: string;
  horario?: string;
  dataInicio: string;
  inscricoesAte?: string;
}): string {
  const partes: string[] = [];
  const quando = [
    turma.diaSemana ? DIA_SEMANA_LABELS[turma.diaSemana] : null,
    turma.horario,
  ]
    .filter(Boolean)
    .join(" ");
  if (quando) partes.push(quando);

  const inicio = formatData(turma.dataInicio);
  if (inicio) partes.push(`início ${inicio}`);

  const ate = formatData(turma.inscricoesAte);
  if (ate) partes.push(`inscrições até ${ate}`);

  return partes.join(" · ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const turma = await getTurmaPorToken(token);
  if (!turma) return { title: "Inscrição — IPC" };

  return {
    title: `${turma.nome} — Inscrições — IPC`,
    description: resumo(turma) || turma.descricao?.slice(0, 160),
  };
}

export default async function InscricaoTurmaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InscricaoPublicaForm token={token} />;
}
