import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

function getBackfillRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.tarefas.migrations.backfillQtdComentarios;
}

/**
 * Recalcula qtdComentarios (valor absoluto, idempotente) para cada tarefa.
 * Rodar APOS deploy das mutations que mantem o campo (comentarios/mutations.ts).
 *
 * Rodar: npx convex run tarefas/migrations:backfillQtdComentarios --prod
 */
export const backfillQtdComentarios = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("tarefas")
      .paginate({ cursor: args.cursor ?? null, numItems: 50 });

    for (const t of page.page) {
      const comentarios = await ctx.db
        .query("comentarios")
        .withIndex("by_entidade", (q) =>
          q.eq("entidadeTipo", "tarefas").eq("entidadeId", t._id),
        )
        .collect();
      await ctx.db.patch(t._id, { qtdComentarios: comentarios.length });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, getBackfillRef(), {
        cursor: page.continueCursor,
      });
    }

    return { processados: page.page.length, isDone: page.isDone };
  },
});
