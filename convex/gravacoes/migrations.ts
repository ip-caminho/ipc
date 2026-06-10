import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { extrairFrases } from "./iaHelpers";

// Lazy-load to avoid TS2589 "type instantiation excessively deep"
function getMigrarIaRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.migrations.migrarIaParaTabela;
}

/**
 * Move iaTranscricao/iaResultado dos docs de gravacoes para a tabela
 * gravacoesIA e denormaliza iaFrases. Roda em lotes pequenos (docs legados
 * tem ~60 KB) e se auto-agenda ate terminar.
 *
 * Rodar apos deploy: npx convex run gravacoes/migrations:migrarIaParaTabela --prod
 */
export const migrarIaParaTabela = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("gravacoes")
      .paginate({ cursor: args.cursor ?? null, numItems: 20 });

    let movidos = 0;
    for (const g of page.page) {
      if (g.iaTranscricao === undefined && g.iaResultado === undefined) continue;

      const pesado: Record<string, unknown> = {};
      if (g.iaTranscricao !== undefined) pesado.transcricao = g.iaTranscricao;
      if (g.iaResultado !== undefined) pesado.resultado = g.iaResultado;

      const existente = await ctx.db
        .query("gravacoesIA")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", g._id))
        .first();
      if (existente) {
        await ctx.db.patch(existente._id, pesado);
      } else {
        await ctx.db.insert("gravacoesIA", { gravacaoId: g._id, ...pesado });
      }

      await ctx.db.patch(g._id, {
        iaTranscricao: undefined,
        iaResultado: undefined,
        iaFrases: g.iaFrases ?? extrairFrases(g.iaResultado),
      });
      movidos++;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, getMigrarIaRef(), {
        cursor: page.continueCursor,
      });
    }

    console.log(`migrarIaParaTabela: ${movidos} movidos neste lote, isDone=${page.isDone}`);
    return { movidos, isDone: page.isDone };
  },
});
