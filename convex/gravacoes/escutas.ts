import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    const progresso = Math.min(100, Math.round((currentTime / duration) * 100));
    const completou = progresso >= 90;
    const now = Date.now();

    // Upsert: find existing record
    const existing = await ctx.db
      .query("escutasGravacao")
      .withIndex("by_gravacao_membro", (q) =>
        q.eq("gravacaoId", gravacaoId).eq("membroId", membroId)
      )
      .first();

    if (existing) {
      // Only update if progress advanced
      const newProgresso = Math.max(existing.progresso, progresso);
      const newUltimoSegundo = Math.max(existing.ultimoSegundo, currentTime);
      await ctx.db.patch(existing._id, {
        ultimoSegundo: newUltimoSegundo,
        duracaoTotal: duration,
        progresso: newProgresso,
        completou: existing.completou || completou,
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

export const listByGravacao = query({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    const escutas = await ctx.db
      .query("escutasGravacao")
      .withIndex("by_gravacao", (q) => q.eq("gravacaoId", gravacaoId))
      .collect();

    return Promise.all(
      escutas.map(async (e) => {
        const membro = await ctx.db.get(e.membroId);
        let nome = "Usuario";
        let foto = null;
        if (membro) {
          const entidade = await ctx.db.get(membro.entidadeId);
          nome = entidade?.nomeCompleto || entidade?.nomeRazaoSocial || "Usuario";
          foto = entidade?.foto || null;
        }
        return { ...e, nome, foto };
      })
    );
  },
});

export const listByMembro = query({
  args: { membroId: v.optional(v.id("membros")) },
  handler: async (ctx, { membroId }) => {
    const id = membroId || (await getMembroId(ctx));
    if (!id) return [];

    const escutas = await ctx.db
      .query("escutasGravacao")
      .withIndex("by_membro", (q) => q.eq("membroId", id))
      .collect();

    return Promise.all(
      escutas.map(async (e) => {
        const gravacao = await ctx.db.get(e.gravacaoId);
        return { ...e, titulo: gravacao?.titulo || "Gravacao removida" };
      })
    );
  },
});
