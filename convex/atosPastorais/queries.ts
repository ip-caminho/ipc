import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAnyPermission } from "../_shared/requirePermission";

export const listByMembro = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, ["membros:read"]);
    const atos = await ctx.db
      .query("atosPastorais")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    return atos.sort((a, b) => b.data.localeCompare(a.data));
  },
});

/**
 * Lista membros com dadosIncertos contendo campos sacramentais,
 * para a secretaria consultar o livro fisico e confirmar.
 */
export const pendentesVerificacao = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyPermission(ctx, ["membros:update"]);
    const entidades = await ctx.db.query("entidades").collect();
    const CAMPOS_SACRAMENTAIS = ["dataBatismo", "dataConversao", "dataMembresia"];

    const pendentes = entidades.filter((e) => {
      const incertos = e.dadosIncertos ?? [];
      return incertos.some((c) => CAMPOS_SACRAMENTAIS.includes(c));
    });

    const result = await Promise.all(
      pendentes.map(async (e) => {
        const membro = await ctx.db
          .query("membros")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", e._id))
          .first();
        if (!membro) return null;
        return {
          membroId: membro._id,
          nomeCompleto: e.nomeCompleto ?? "",
          foto: e.foto,
          camposIncertos: (e.dadosIncertos ?? []).filter((c) =>
            CAMPOS_SACRAMENTAIS.includes(c)
          ),
        };
      })
    );

    return result.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});
