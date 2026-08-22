import { query } from "../_generated/server";
import { avaliarJanelaInscricao } from "../turmas/lib/inscricoes";
import { getSaoPauloDateString } from "../_shared/datetime";

/**
 * Turmas com inscricao aberta para o site publico (home e /inscricoes).
 *
 * Opt-in por `publicarNoSite`: sem isso, toda turma aberta iria para o site e o
 * token de inscricao de todas elas ficaria publico — foi por isso que a query
 * antiga (listTurmasAbertas) foi removida. Aqui o token vai de proposito: ele E
 * o endereco do formulario que a igreja quer divulgar.
 */
export type TurmaPublica = {
  _id: string;
  nome: string;
  descricao?: string;
  cursoNome?: string;
  dataInicio: string;
  diaSemana?: string;
  horario?: string;
  local?: string;
  inscricoesAte?: string;
  vagasRestantes: number | null;
  token: string;
};

export const listAbertas = query({
  args: {},
  handler: async (ctx): Promise<TurmaPublica[]> => {
    const hoje = getSaoPauloDateString();

    const turmas = await ctx.db
      .query("turmas")
      .withIndex("by_status", (q) => q.eq("status", "ABERTA"))
      .collect();

    const publicas = turmas.filter(
      (t) => t.publicarNoSite && t.token && avaliarJanelaInscricao(t, hoje).aberta
    );

    return await Promise.all(
      publicas
        .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
        .map(async (t) => {
          const curso = t.cursoId ? await ctx.db.get(t.cursoId) : null;
          return {
            _id: t._id,
            nome: t.nome,
            descricao: t.descricao,
            cursoNome: curso?.nome,
            dataInicio: t.dataInicio,
            diaSemana: t.diaSemana,
            horario: t.horario,
            local: t.local,
            inscricoesAte: t.inscricoesAte,
            vagasRestantes: t.vagas ? Math.max(0, t.vagas - t.vagasOcupadas) : null,
            token: t.token!,
          };
        })
    );
  },
});
