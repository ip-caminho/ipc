import { query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkPermission } from "../_shared/requirePermission";
import type { Id } from "../_generated/dataModel";

/**
 * Visao de CONSULTA do instrutor: ver quem se inscreveu, o que respondeu e um
 * resumo. Nada de edicao — quem administra turma e a secretaria.
 *
 * Gate: ser instrutor da turma OU ter turmas:read. O instrutor costuma ser
 * membro comum, sem permissao de turmas, por isso o vinculo vale como acesso.
 */
async function membroLogado(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();
}

// Turmas em que o membro logado e instrutor. Vazio para todo mundo mais — e o
// que faz o card do dashboard aparecer so para quem da aula.
export const minhasTurmas = query({
  args: {},
  handler: async (ctx) => {
    const membro = await membroLogado(ctx);
    if (!membro) return [];

    const turmas = await ctx.db
      .query("turmas")
      .withIndex("by_instrutor", (q) => q.eq("instrutorId", membro._id))
      .collect();

    return await Promise.all(
      turmas
        .sort((a, b) => b.criadoEm - a.criadoEm)
        .map(async (t) => {
          const inscricoes = await ctx.db
            .query("inscricoes")
            .withIndex("by_turma_status", (q) =>
              q.eq("turmaId", t._id).eq("status", "CONFIRMADA")
            )
            .collect();
          return {
            _id: t._id,
            nome: t.nome,
            status: t.status,
            dataInicio: t.dataInicio,
            diaSemana: t.diaSemana,
            horario: t.horario,
            local: t.local,
            totalConfirmados: inscricoes.length,
          };
        })
    );
  },
});

async function podeConsultar(ctx: QueryCtx, turmaId: Id<"turmas">) {
  if (await checkPermission(ctx, "turmas:read")) return true;
  const membro = await membroLogado(ctx);
  if (!membro) return false;
  const turma = await ctx.db.get(turmaId);
  return !!turma && turma.instrutorId === membro._id;
}

export const painel = query({
  args: { turmaId: v.id("turmas") },
  handler: async (ctx, { turmaId }) => {
    if (!(await podeConsultar(ctx, turmaId))) return null;

    const turma = await ctx.db.get(turmaId);
    if (!turma) return null;
    const curso = turma.cursoId ? await ctx.db.get(turma.cursoId) : null;

    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect();

    const aulas = await ctx.db
      .query("turmaEncontros")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect();

    const perguntas = turma.perguntasExtras ?? [];
    const rotulo = new Map(perguntas.map((p) => [p.id, p.label]));

    const ativas = inscricoes.filter((i) => i.status !== "CANCELADA");

    // Contagem por opcao, so das perguntas de escolha — o resto e texto livre e
    // nao agrega.
    const resumoRespostas = perguntas
      .filter((p) => p.tipo === "ESCOLHA_UNICA" || p.tipo === "ESCOLHA_MULTIPLA")
      .map((p) => {
        const contagens = (p.opcoes ?? []).map((opcao) => ({
          opcao,
          total: ativas.filter((i) => {
            const r = i.respostasExtras?.find((x) => x.perguntaId === p.id);
            if (!r) return false;
            return r.valores ? r.valores.includes(opcao) : r.valor === opcao;
          }).length,
        }));
        return {
          perguntaId: p.id,
          label: p.label,
          multipla: p.tipo === "ESCOLHA_MULTIPLA",
          contagens,
        };
      })
      // Pergunta sem nenhuma resposta ainda nao virou grafico vazio na tela.
      .filter((r) => r.contagens.some((c) => c.total > 0));

    return {
      turma: {
        _id: turma._id,
        nome: turma.nome,
        cursoNome: curso?.nome ?? null,
        status: turma.status,
        dataInicio: turma.dataInicio,
        dataFim: turma.dataFim,
        diaSemana: turma.diaSemana,
        horario: turma.horario,
        local: turma.local,
      },
      resumo: {
        confirmados: inscricoes.filter((i) => i.status === "CONFIRMADA").length,
        listaEspera: inscricoes.filter((i) => i.status === "LISTA_ESPERA").length,
        cancelados: inscricoes.filter((i) => i.status === "CANCELADA").length,
        aulas: aulas.length,
        aulasComChamada: aulas.filter((a) => a.presencaRegistradaEm).length,
      },
      resumoRespostas,
      // Cancelada nao aparece: o instrutor quer falar com quem esta na turma.
      inscritos: ativas
        .sort((a, b) => a.dadosSistema.nomeCompleto.localeCompare(b.dadosSistema.nomeCompleto))
        .map((i) => ({
          _id: i._id,
          nome: i.dadosSistema.nomeCompleto,
          whatsapp: i.dadosSistema.whatsapp,
          email: i.dadosSistema.email,
          dataNascimento: i.dadosSistema.dataNascimento,
          status: i.status,
          respostas: (i.respostasExtras ?? []).map((r) => ({
            label: rotulo.get(r.perguntaId) ?? r.perguntaId,
            valor: r.valor,
            valores: r.valores,
          })),
        })),
    };
  },
});
