import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { calcProgress, isComplete, mergeHeartbeat } from "./escutasHelpers";

async function getMembroId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  return membro?._id ?? null;
}

export const heartbeat = mutation({
  args: {
    gravacaoId: v.id("gravacoes"),
    currentTime: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, { gravacaoId, currentTime, duration }) => {
    const membroId = await getMembroId(ctx);
    if (!membroId || duration <= 0) return;

    const progresso = calcProgress(currentTime, duration);
    const completou = isComplete(progresso);
    const now = Date.now();

    // Upsert: find existing record
    const existing = await ctx.db
      .query("escutasGravacao")
      .withIndex("by_gravacao_membro", (q) =>
        q.eq("gravacaoId", gravacaoId).eq("membroId", membroId)
      )
      .first();

    if (existing) {
      const merged = mergeHeartbeat(existing, progresso, currentTime);
      await ctx.db.patch(existing._id, {
        ultimoSegundo: merged.ultimoSegundo,
        duracaoTotal: duration,
        progresso: merged.progresso,
        completou: merged.completou,
        atualizadoEm: now,
      });
    } else {
      await ctx.db.insert("escutasGravacao", {
        gravacaoId,
        membroId,
        ultimoSegundo: currentTime,
        duracaoTotal: duration,
        progresso,
        completou,
        iniciadoEm: now,
        atualizadoEm: now,
      });
    }
  },
});

export const getMyProgress = query({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    const membroId = await getMembroId(ctx);
    if (!membroId) return null;

    return await ctx.db
      .query("escutasGravacao")
      .withIndex("by_gravacao_membro", (q) =>
        q.eq("gravacaoId", gravacaoId).eq("membroId", membroId)
      )
      .first();
  },
});

/**
 * Último sermão em progresso do usuário atual.
 * Filtra por: sermão publicado, progresso entre 5% e 95%, não completado.
 * Ordena por atualizadoEm desc e retorna o primeiro.
 *
 * Itera lazy pelo indice by_membro_atualizado (desc) com early-exit — essa
 * query e invalidada pelo heartbeat do player a cada 15s durante a escuta,
 * entao cada re-execucao precisa ler poucos docs, nao o historico inteiro.
 */
export const continuarOuvindo = query({
  args: {},
  handler: async (ctx) => {
    const membroId = await getMembroId(ctx);
    if (!membroId) return null;

    const iter = ctx.db
      .query("escutasGravacao")
      .withIndex("by_membro_atualizado", (q) => q.eq("membroId", membroId))
      .order("desc");

    for await (const e of iter) {
      if (e.completou || e.progresso <= 0.05 || e.progresso >= 0.95) continue;
      const gravacao = await ctx.db.get(e.gravacaoId);
      if (!gravacao) continue;
      if (gravacao.tipo !== "SERMAO") continue;
      if (gravacao.status !== "PUBLICADO") continue;

      let pregadorNome: string | null = gravacao.pregadorNome ?? null;
      if (!pregadorNome && gravacao.pregadorId) {
        const pregador = await ctx.db.get(gravacao.pregadorId);
        if (pregador) {
          const entidade = await ctx.db.get(pregador.entidadeId);
          pregadorNome = entidade?.nomeCompleto ?? null;
        }
      }

      return {
        gravacaoId: gravacao._id,
        titulo: gravacao.titulo,
        pregadorNome,
        serieId: gravacao.serieId ?? null,
        ultimoSegundo: e.ultimoSegundo,
        duracaoTotal: e.duracaoTotal,
        progresso: e.progresso,
        atualizadoEm: e.atualizadoEm,
      };
    }

    return null;
  },
});
