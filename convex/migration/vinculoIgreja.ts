import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migracao 01: derivar `entidades.vinculoIgreja` a partir de status + membros.
 *
 * Logica:
 * - row em `membros` + status=ATIVO  -> MEMBRO
 * - row em `membros` + status=INATIVO -> MEMBRO (inativo nao e ex)
 * - row em `membros` + status TRANSFERIDO/DESLIGADO/FALECIDO -> EX_MEMBRO
 * - sem row em `membros` -> NAO_MEMBRO
 *
 * Idempotente: se `vinculoIgreja` ja esta setado, mantem (admin pode ter
 * reclassificado manualmente como FREQUENTADOR/VISITANTE).
 *
 * Uso: rodar via Convex dashboard ou MCP `runOneoffQuery` com
 *   await ctx.runMutation(internal.migration.vinculoIgreja.run, { dryRun: false });
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = false }) => {
    const stats = {
      total: 0,
      ja_definido: 0,
      definido_membro: 0,
      definido_ex_membro: 0,
      definido_nao_membro: 0,
    };

    const entidades = await ctx.db.query("entidades").collect();
    stats.total = entidades.length;

    for (const entidade of entidades) {
      if (entidade.vinculoIgreja) {
        stats.ja_definido++;
        continue;
      }

      const membro = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
        .first();

      let vinculo: "MEMBRO" | "EX_MEMBRO" | "NAO_MEMBRO";

      if (!membro) {
        vinculo = "NAO_MEMBRO";
        stats.definido_nao_membro++;
      } else if (
        entidade.status === "TRANSFERIDO" ||
        entidade.status === "DESLIGADO" ||
        entidade.status === "FALECIDO"
      ) {
        vinculo = "EX_MEMBRO";
        stats.definido_ex_membro++;
      } else {
        vinculo = "MEMBRO";
        stats.definido_membro++;
      }

      if (!dryRun) {
        await ctx.db.patch(entidade._id, { vinculoIgreja: vinculo });
      }
    }

    return stats;
  },
});
