import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAnyPermission } from "../_shared/requirePermission";
import { calculateCompleteness, isStale } from "./completeness";

export const getMyCompleteness = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade) return null;

    const dadosIncertos = (entidade.dadosIncertos as string[] | undefined) ?? [];
    const result = calculateCompleteness(entidade, membro, dadosIncertos);
    const perfilAtualizadoEm = entidade.perfilAtualizadoEm as number | undefined;

    return {
      ...result,
      lastUpdated: perfilAtualizadoEm ?? null,
      isStale: isStale(perfilAtualizadoEm),
    };
  },
});

export const getRegistryVitality = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyPermission(ctx, ["membros:read"]);

    const membros = await ctx.db.query("membros").collect();
    const now = Date.now();

    const results = await Promise.all(
      membros.map(async (m) => {
        const entidade = await ctx.db.get(m.entidadeId);
        if (!entidade || entidade.status !== "ATIVO") return null;

        const dadosIncertos = (entidade.dadosIncertos as string[] | undefined) ?? [];
        const comp = calculateCompleteness(entidade, m, dadosIncertos);
        const perfilAtualizadoEm = entidade.perfilAtualizadoEm as number | undefined;

        return {
          membroId: m._id,
          nome: entidade.nomeCompleto ?? "",
          foto: entidade.foto ?? null,
          percentage: comp.percentage,
          missingCount: comp.missing.length,
          missing: comp.missing,
          lastUpdated: perfilAtualizadoEm ?? null,
          isStale: isStale(perfilAtualizadoEm, now),
        };
      })
    );

    const active = results.filter(Boolean) as NonNullable<(typeof results)[0]>[];
    active.sort((a, b) => a.percentage - b.percentage);

    const totalMembros = active.length;
    const completosCount = active.filter((m) => m.percentage === 100).length;
    const atualizadosCount = active.filter((m) => !m.isStale).length;
    const avgCompleteness =
      totalMembros > 0
        ? Math.round(active.reduce((sum, m) => sum + m.percentage, 0) / totalMembros)
        : 0;

    return {
      totalMembros,
      completosCount,
      completosPercent: totalMembros > 0 ? Math.round((completosCount / totalMembros) * 100) : 0,
      atualizadosCount,
      atualizadosPercent: totalMembros > 0 ? Math.round((atualizadosCount / totalMembros) * 100) : 0,
      avgCompleteness,
      membros: active,
    };
  },
});
