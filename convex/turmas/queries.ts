import { query, type QueryCtx } from "../_generated/server";
import { getSaoPauloDateString, getSaoPauloWeekday } from "../_shared/datetime";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkPermission } from "../_shared/requirePermission";
import type { Doc, Id } from "../_generated/dataModel";

import { resolveMembroNome } from "../_shared/membroResolver";

/**
 * Leitura de uma turma: quem tem turmas:read ve qualquer uma; o instrutor ve
 * apenas a propria (pode ser membro comum sem a permissao — a chamada sai do
 * widget do dashboard). Devolve null em vez de lancar, porque as telas rodam o
 * useQuery antes do gate de render.
 */
async function canReadTurma(ctx: QueryCtx, turmaId: Id<"turmas">) {
  const leitor = await checkPermission(ctx, "turmas:read");
  if (leitor) return leitor.membro;

  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();
  if (!membro) return null;

  const turma = await ctx.db.get(turmaId);
  if (!turma || turma.instrutorId !== membro._id) return null;
  return membro;
}

// Turmas onde o membro logado e instrutor, com info de chamada
// Mostra:
// 1. Turmas com aula hoje (criar encontro se nao existe)
// 2. Encontros criados nas ultimas 48h sem presenca marcada (janela para preencher)
export const minhasTurmasInstrutor = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const turmasInstrutor = await ctx.db
      .query("turmas")
      .withIndex("by_instrutor", (q) => q.eq("instrutorId", membro._id))
      .collect();
    const minhas = turmasInstrutor.filter(
      (t) => t.status === "ABERTA" || t.status === "EM_ANDAMENTO"
    );

    const hoje = getSaoPauloDateString();
    const diaSemanaHoje = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"][getSaoPauloWeekday()];
    const agora = Date.now();
    const limite48h = agora - 48 * 60 * 60 * 1000;

    const resultados: Array<{
      _id: string;
      nome: string;
      diaSemana?: string;
      horario?: string;
      totalInscritos: number;
      isDiaDeAula: boolean;
      encontroId: string | null;
      encontroData: string;
      criadoEm: number;
      expiraEm: number; // timestamp do limite (criadoEm + 48h)
    }> = [];

    for (const t of minhas) {
      const encontros = await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", t._id))
        .collect();

      const inscricoes = await ctx.db
        .query("inscricoes")
        .withIndex("by_turma_status", (q) =>
          q.eq("turmaId", t._id).eq("status", "CONFIRMADA")
        )
        .collect();

      const isDiaDeAula = t.diaSemana === diaSemanaHoje;
      const encontroHoje = encontros.find((e) => e.data === hoje);

      // Caso 1: e dia de aula hoje
      if (isDiaDeAula) {
        resultados.push({
          _id: t._id,
          nome: t.nome,
          diaSemana: t.diaSemana,
          horario: t.horario,
          totalInscritos: inscricoes.length,
          isDiaDeAula: true,
          encontroId: encontroHoje?._id || null,
          encontroData: hoje,
          criadoEm: encontroHoje?.criadoEm || agora,
          expiraEm: (encontroHoje?.criadoEm || agora) + 48 * 60 * 60 * 1000,
        });
      }

      // Caso 2: encontros pendentes (criados nas ultimas 48h, nao foi hoje)
      for (const e of encontros) {
        if (e.data === hoje) continue; // ja tratado acima
        if (e.criadoEm < limite48h) continue; // ja passou da janela

        // Chamada ja feita? Le o campo do encontro em vez das presencas.
        // Encontros criados antes deste campo existir aparecem como pendentes
        // durante a janela — some sozinho quando ela expira.
        if (e.presencaRegistradaEm) continue;

        resultados.push({
          _id: t._id,
          nome: t.nome,
          diaSemana: t.diaSemana,
          horario: t.horario,
          totalInscritos: inscricoes.length,
          isDiaDeAula: false,
          encontroId: e._id,
          encontroData: e.data,
          criadoEm: e.criadoEm,
          expiraEm: e.criadoEm + 48 * 60 * 60 * 1000,
        });
      }
    }

    return resultados;
  },
});

export const listTurmas = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await checkPermission(ctx, "turmas:read"))) return [];

    // Ordem por _creationTime desc equivale a criadoEm desc (criadoEm e
    // Date.now() no insert) e sai do indice, sem sort em memoria.
    const status = args.status as Doc<"turmas">["status"] | undefined;
    const turmas = status
      ? await ctx.db
          .query("turmas")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      : await ctx.db.query("turmas").order("desc").collect();

    return Promise.all(
      turmas
        .map(async (t) => {
          const instrutorNome = t.instrutorId
            ? await resolveMembroNome(ctx, t.instrutorId)
            : t.instrutorNome || "";
          return {
            ...t,
            instrutorNomeResolved: instrutorNome,
            vagasRestantes: t.vagas ? Math.max(0, t.vagas - t.vagasOcupadas) : null,
          };
        })
    );
  },
});

export const getById = query({
  args: { id: v.id("turmas") },
  handler: async (ctx, { id }) => {
    if (!(await canReadTurma(ctx, id))) return null;

    const turma = await ctx.db.get(id);
    if (!turma) return null;

    const instrutorNome = turma.instrutorId
      ? await resolveMembroNome(ctx, turma.instrutorId)
      : turma.instrutorNome || "";

    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", id))
      .collect();

    return {
      ...turma,
      instrutorNomeResolved: instrutorNome,
      vagasRestantes: turma.vagas ? Math.max(0, turma.vagas - turma.vagasOcupadas) : null,
      totalInscritos: inscricoes.filter((i) => i.status === "CONFIRMADA").length,
      totalListaEspera: inscricoes.filter((i) => i.status === "LISTA_ESPERA").length,
    };
  },
});

// Query publica (sem auth) — lista turmas abertas para landing page
export const listTurmasAbertas = query({
  args: {},
  handler: async (ctx) => {
    const abertas = (
      await ctx.db
        .query("turmas")
        .withIndex("by_status", (q) => q.eq("status", "ABERTA"))
        .collect()
    ).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

    return Promise.all(
      abertas.map(async (t) => {
        const instrutorNome = t.instrutorId
          ? await resolveMembroNome(ctx, t.instrutorId)
          : t.instrutorNome || "";

        return {
          _id: t._id,
          nome: t.nome,
          tipo: t.tipo,
          descricao: t.descricao,
          dataInicio: t.dataInicio,
          dataFim: t.dataFim,
          diaSemana: t.diaSemana,
          horario: t.horario,
          local: t.local,
          token: t.token,
          instrutorNome,
          vagasRestantes: t.vagas ? Math.max(0, t.vagas - t.vagasOcupadas) : null,
        };
      })
    );
  },
});

// Query publica (sem auth) — para pagina de inscricao
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const turma = await ctx.db
      .query("turmas")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!turma) return null;

    return {
      _id: turma._id,
      nome: turma.nome,
      tipo: turma.tipo,
      descricao: turma.descricao,
      dataInicio: turma.dataInicio,
      dataFim: turma.dataFim,
      diaSemana: turma.diaSemana,
      horario: turma.horario,
      local: turma.local,
      status: turma.status,
      camposSistema: turma.camposSistema,
      perguntasExtras: turma.perguntasExtras,
      vagasRestantes: turma.vagas ? Math.max(0, turma.vagas - turma.vagasOcupadas) : null,
    };
  },
});

export const listInscricoes = query({
  args: {
    turmaId: v.id("turmas"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Traz PII dos inscritos (whatsapp, email, nascimento): exige turmas:read.
    // Degrada para [] em vez de lancar — a pagina roda o useQuery antes do gate
    // de render.
    if (!(await checkPermission(ctx, "turmas:read"))) return [];

    let inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", args.turmaId))
      .collect();

    if (args.status) inscricoes = inscricoes.filter((i) => i.status === args.status);

    return inscricoes.sort((a, b) => a.criadoEm - b.criadoEm);
  },
});

export const minhasInscricoes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    return Promise.all(
      inscricoes
        .filter((i) => i.status !== "CANCELADA")
        .map(async (i) => {
          const turma = await ctx.db.get(i.turmaId);
          return { ...i, turmaNome: turma?.nome || "" };
        })
    );
  },
});

export const listEncontros = query({
  args: { turmaId: v.id("turmas") },
  handler: async (ctx, { turmaId }) => {
    if (!(await canReadTurma(ctx, turmaId))) return [];

    const encontros = await ctx.db
      .query("turmaEncontros")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect();

    return Promise.all(
      encontros
        .sort((a, b) => a.data.localeCompare(b.data))
        .map(async (e) => {
          const presencas = await ctx.db
            .query("turmaPresencas")
            .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", e._id))
            .collect();
          return {
            ...e,
            totalPresentes: presencas.filter((p) => p.presente).length,
            totalAusentes: presencas.filter((p) => !p.presente).length,
          };
        })
    );
  },
});

export const getPresencas = query({
  args: { encontroId: v.id("turmaEncontros") },
  handler: async (ctx, { encontroId }) => {
    const encontro = await ctx.db.get(encontroId);
    if (!encontro) return [];
    if (!(await canReadTurma(ctx, encontro.turmaId))) return [];

    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma_status", (q) =>
        q.eq("turmaId", encontro.turmaId).eq("status", "CONFIRMADA")
      )
      .collect();

    const presencas = await ctx.db
      .query("turmaPresencas")
      .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", encontroId))
      .collect();

    const presencaMap = new Map(presencas.map((p) => [p.inscricaoId, p]));

    return inscricoes.map((i) => {
      const p = presencaMap.get(i._id);
      return {
        inscricaoId: i._id,
        nome: i.dadosSistema.nomeCompleto,
        presente: p?.presente ?? false,
        presencaId: p?._id,
      };
    });
  },
});

export const getFrequenciaResumo = query({
  args: { turmaId: v.id("turmas") },
  handler: async (ctx, { turmaId }) => {
    if (!(await canReadTurma(ctx, turmaId))) return [];

    const encontros = await ctx.db
      .query("turmaEncontros")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect();
    const totalEncontros = encontros.length;
    if (totalEncontros === 0) return [];

    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma_status", (q) =>
        q.eq("turmaId", turmaId).eq("status", "CONFIRMADA")
      )
      .collect();

    return Promise.all(
      inscricoes.map(async (i) => {
        const presencas = await ctx.db
          .query("turmaPresencas")
          .withIndex("by_inscricao", (q) => q.eq("inscricaoId", i._id))
          .collect();
        const presentes = presencas.filter((p) => p.presente).length;
        return {
          inscricaoId: i._id,
          nome: i.dadosSistema.nomeCompleto,
          presentes,
          totalEncontros,
          percentual: Math.round((presentes / totalEncontros) * 100),
        };
      })
    );
  },
});
