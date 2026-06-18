import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// True se a data YYYY-MM-DD NAO cai num domingo (UTC, sem fuso — a data ja e
// um dia civil). Domingo = getUTCDay() === 0.
function naoEhDomingo(data: string): boolean {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0;
}

/**
 * Remove cultos marcados como DOMINICAL cujo dia NAO e domingo (dado invalido —
 * "dominical" numa quarta). Cascade igual ao deleteCulto: apaga cultoEscalas e
 * cultoLouvores antes do culto. Cultos ESPECIAL (qualquer dia) sao preservados.
 *
 * Idempotente. Use { dryRun: true } para apenas LISTAR o que seria removido.
 *
 * Dry-run prod:  npx convex run escalas/migrations:limparCultosNaoDominicais '{"dryRun":true}' --prod
 * Apagar prod:   npx convex run escalas/migrations:limparCultosNaoDominicais --prod
 */
export const limparCultosNaoDominicais = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const cultos = await ctx.db.query("cultos").collect();
    const alvos = cultos.filter(
      (c) => c.tipo === "DOMINICAL" && naoEhDomingo(c.data),
    );

    const resumo = alvos
      .map((c) => ({ data: c.data, status: c.status }))
      .sort((a, b) => a.data.localeCompare(b.data));

    if (dryRun) {
      return { dryRun: true, total: alvos.length, cultos: resumo };
    }

    let escalasRemovidas = 0;
    let louvoresRemovidos = 0;
    for (const culto of alvos) {
      const escalas = await ctx.db
        .query("cultoEscalas")
        .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
        .collect();
      for (const e of escalas) {
        await ctx.db.delete(e._id);
        escalasRemovidas++;
      }

      const louvores = await ctx.db
        .query("cultoLouvores")
        .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
        .collect();
      for (const l of louvores) {
        await ctx.db.delete(l._id);
        louvoresRemovidos++;
      }

      await ctx.db.delete(culto._id);
    }

    console.log(
      `limparCultosNaoDominicais: ${alvos.length} cultos, ${escalasRemovidas} escalas, ${louvoresRemovidos} louvores removidos`,
    );
    return {
      dryRun: false,
      cultosRemovidos: alvos.length,
      escalasRemovidas,
      louvoresRemovidos,
      cultos: resumo,
    };
  },
});
