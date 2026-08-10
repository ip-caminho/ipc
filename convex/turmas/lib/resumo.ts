import type { QueryCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getSaoPauloDateString } from "../../_shared/datetime";
import { FREQUENCIA_MINIMA_PADRAO } from "./constants";
import { calcularFrequencia, type ResumoFrequencia } from "./frequencia";

export type AlunoFrequencia = ResumoFrequencia & {
  inscricaoId: Id<"inscricoes">;
  nome: string;
  observacoesInstrutor?: string;
  frequenciaMinima: number;
};

/**
 * Frequencia de todos os inscritos confirmados de uma turma.
 *
 * Compartilhado entre a tela de frequencia e a emissao de certificado — a regra
 * tem que ser a mesma nos dois lugares, senao o papel sai com numero diferente
 * do que a secretaria viu.
 */
export async function resumoFrequenciaTurma(
  ctx: QueryCtx,
  turmaId: Id<"turmas">
): Promise<AlunoFrequencia[]> {
  const turma = await ctx.db.get(turmaId);
  if (!turma) return [];

  const aulas = await ctx.db
    .query("turmaEncontros")
    .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
    .collect();

  const inscricoes = await ctx.db
    .query("inscricoes")
    .withIndex("by_turma_status", (q) =>
      q.eq("turmaId", turmaId).eq("status", "CONFIRMADA")
    )
    .collect();
  if (inscricoes.length === 0) return [];

  // Le as presencas por AULA (uma leitura por aula) em vez de por aluno: aulas
  // sao poucas (8-12) e alunos podem ser dezenas.
  const presencaPorAluno = new Map<string, Map<string, boolean>>();
  for (const a of aulas) {
    if (!a.presencaRegistradaEm) continue; // aula sem chamada nao entra
    const presencas = await ctx.db
      .query("turmaPresencas")
      .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", a._id))
      .collect();
    for (const p of presencas) {
      const doAluno = presencaPorAluno.get(p.inscricaoId) ?? new Map();
      doAluno.set(a._id, p.presente);
      presencaPorAluno.set(p.inscricaoId, doAluno);
    }
  }

  const minima = turma.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO;

  return inscricoes.map((i) => ({
    inscricaoId: i._id,
    nome: i.dadosSistema.nomeCompleto,
    observacoesInstrutor: i.observacoesInstrutor,
    frequenciaMinima: minima,
    ...calcularFrequencia({
      aulas,
      presencaPorAula: presencaPorAluno.get(i._id) ?? new Map(),
      inscritoDesde: getSaoPauloDateString(new Date(i.criadoEm)),
      frequenciaMinima: minima,
    }),
  }));
}
