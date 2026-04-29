import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkPermission } from "../_shared/requirePermission";

/**
 * Conta avisos não lidos pelo usuário autenticado.
 * Busca a gravação mais recente com avisos (via mesma lógica de getLatestAvisos)
 * e retorna 0 se o membro já marcou como lida, ou total de avisos caso contrário.
 */
export const countNaoLidos = query({
  args: {},
  handler: async (ctx) => {
    if (!(await checkPermission(ctx, "gravacoes:read"))) return 0;
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return 0;

    // Busca última gravação com avisos (mesma lógica de getLatestAvisos)
    const iter = ctx.db.query("gravacoes").withIndex("by_data").order("desc");

    for await (const g of iter) {
      if (
        g.tipo === "SERMAO" &&
        g.iaStatus === "CONCLUIDO" &&
        g.iaAvisos &&
        g.iaAvisos.length > 0
      ) {
        const leitura = await ctx.db
          .query("avisosLeituras")
          .withIndex("by_membro_gravacao", (q) =>
            q.eq("membroId", membro._id).eq("gravacaoId", g._id)
          )
          .first();
        if (leitura) return 0;
        return g.iaAvisos.length;
      }
    }

    return 0;
  },
});

/** Marca os avisos de uma gravação como lidos pelo usuário autenticado. */
export const marcarComoLido = mutation({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    const existing = await ctx.db
      .query("avisosLeituras")
      .withIndex("by_membro_gravacao", (q) =>
        q.eq("membroId", membro._id).eq("gravacaoId", gravacaoId)
      )
      .first();

    if (existing) return existing._id;

    return ctx.db.insert("avisosLeituras", {
      gravacaoId,
      membroId: membro._id,
      lidoEm: Date.now(),
    });
  },
});
