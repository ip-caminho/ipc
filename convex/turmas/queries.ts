import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function resolveMembroNome(ctx: any, membroId: any): Promise<string> {
  if (!membroId) return "";
  const membro = await ctx.db.get(membroId);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.nomeCompleto || "";
}

export const listTipos = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let tipos = await ctx.db.query("tiposTurma").collect();
    if (status) tipos = tipos.filter((t) => t.status === status);
    return tipos;
  },
});

export const listTurmas = query({
  args: {
    tipoId: v.optional(v.id("tiposTurma")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let turmas = await ctx.db.query("turmas").collect();
    if (args.tipoId) turmas = turmas.filter((t) => t.tipoTurmaId === args.tipoId);
    if (args.status) turmas = turmas.filter((t) => t.status === args.status);

    return Promise.all(
      turmas
        .sort((a, b) => b.criadoEm - a.criadoEm)
        .map(async (t) => {
          const tipo = await ctx.db.get(t.tipoTurmaId);
          const instrutorNome = t.instrutorId
            ? await resolveMembroNome(ctx, t.instrutorId)
            : t.instrutorNome || "";
          return {
            ...t,
            tipoNome: tipo?.nome || "",
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const turma = await ctx.db.get(id);
    if (!turma) return null;

    const tipo = await ctx.db.get(turma.tipoTurmaId);
    const instrutorNome = turma.instrutorId
      ? await resolveMembroNome(ctx, turma.instrutorId)
      : turma.instrutorNome || "";

    // Contar inscricoes
    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", id))
      .collect();

    return {
      ...turma,
      tipoNome: tipo?.nome || "",
      instrutorNomeResolved: instrutorNome,
      vagasRestantes: turma.vagas ? Math.max(0, turma.vagas - turma.vagasOcupadas) : null,
      totalInscritos: inscricoes.filter((i) => i.status === "CONFIRMADA").length,
      totalListaEspera: inscricoes.filter((i) => i.status === "LISTA_ESPERA").length,
    };
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

    const tipo = await ctx.db.get(turma.tipoTurmaId);

    return {
      _id: turma._id,
      nome: turma.nome,
      tipoNome: tipo?.nome || "",
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

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
            .withIndex("by_encontro", (q) => q.eq("encontroId", e._id))
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const encontro = await ctx.db.get(encontroId);
    if (!encontro) return [];

    // Buscar inscritos confirmados da turma
    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma_status", (q) =>
        q.eq("turmaId", encontro.turmaId).eq("status", "CONFIRMADA")
      )
      .collect();

    const presencas = await ctx.db
      .query("turmaPresencas")
      .withIndex("by_encontro", (q) => q.eq("encontroId", encontroId))
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

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
