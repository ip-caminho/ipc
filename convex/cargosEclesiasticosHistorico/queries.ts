import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAnyPermission } from "../_shared/requirePermission";

export const listByMembro = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, ["membros:read"]);
    const cargos = await ctx.db
      .query("cargosEclesiasticosHistorico")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    return cargos.sort((a, b) => b.mandatoInicio.localeCompare(a.mandatoInicio));
  },
});

/**
 * Lista mandatos ativos com vencimento proximo (Const IPB Art 54: 5 anos).
 * Util para diaconato/presbiteros saberem quando precisam ser reeleitos.
 */
export const vencendoEm = query({
  args: { dias: v.optional(v.number()) },
  handler: async (ctx, { dias = 90 }) => {
    await requireAnyPermission(ctx, ["membros:read"]);
    const cargos = await ctx.db
      .query("cargosEclesiasticosHistorico")
      .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
      .collect();

    const limiteMs = 5 * 365 * 24 * 60 * 60 * 1000; // 5 anos
    const alertaMs = dias * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const result = await Promise.all(
      cargos.map(async (c) => {
        const inicio = new Date(c.mandatoInicio).getTime();
        const vencimento = inicio + limiteMs;
        if (vencimento - now > alertaMs) return null;
        const membro = await ctx.db.get(c.membroId);
        if (!membro) return null;
        const entidade = await ctx.db.get(membro.entidadeId);
        return {
          ...c,
          nomeCompleto: entidade?.nomeCompleto ?? "",
          foto: entidade?.foto,
          vencimentoEm: vencimento,
        };
      })
    );
    return result.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});
