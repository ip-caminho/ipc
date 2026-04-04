import { mutation } from "../_generated/server";

/**
 * Migration: popular cultoLouvores a partir de cultos.louvores (string[]).
 * Executar uma vez via dashboard: npx convex run escalas/migrateLegacyLouvores:migrate
 */
export const migrate = mutation({
  args: {},
  handler: async (ctx) => {
    const cultos = await ctx.db.query("cultos").collect();
    const allLouvores = await ctx.db.query("louvores").collect();

    // Index por titulo (case-insensitive) para lookup rápido
    const louvorByTitulo = new Map<string, any>();
    for (const l of allLouvores) {
      louvorByTitulo.set(l.titulo.toLowerCase(), l);
    }

    let migrated = 0;
    let skipped = 0;

    for (const culto of cultos) {
      if (!culto.louvores || culto.louvores.length === 0) {
        skipped++;
        continue;
      }

      // Verificar se já tem dados em cultoLouvores
      const existing = await ctx.db
        .query("cultoLouvores")
        .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Migrar
      for (let i = 0; i < culto.louvores.length; i++) {
        const item = culto.louvores[i];

        if (item.startsWith("---")) {
          // Separador
          await ctx.db.insert("cultoLouvores", {
            cultoId: culto._id,
            ordem: i,
            secao: item.slice(3),
          });
        } else {
          // Música — tentar encontrar pelo título
          const found = louvorByTitulo.get(item.toLowerCase());
          await ctx.db.insert("cultoLouvores", {
            cultoId: culto._id,
            louvorId: found?._id,
            tituloLegado: item,
            tom: found?.tom,
            ordem: i,
          });
        }
      }

      migrated++;
    }

    return { migrated, skipped, total: cultos.length };
  },
});
