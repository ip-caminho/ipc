import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migracao 02 (fase 2 do item D): remove "MEMBRO" e "DEPENDENTE" de
 * `entidades.papeis` nos registros legados.
 *
 * Contexto: `papeis` deixou de marcar membresia — ser membro/dependente e
 * derivado da linha em `membros` + `vinculoIgreja` (ja preenchido pela
 * Migracao 01). A fase 1 (PR #143) fez o codigo PARAR de escrever
 * MEMBRO/DEPENDENTE em `papeis`; este backfill limpa o que os cadastros
 * ANTIGOS ainda tem pendurado. `papeis` fica so com papeis de PJ/nao-membro
 * (FORNECEDOR, IGREJA_PARCEIRA, VISITANTE, CONTATO), que NAO sao tocados.
 *
 * Seguro:
 * - dryRun LIGADO por padrao — sem argumento, so CONTA (nao escreve nada).
 * - Idempotente: rodar de novo nao afeta quem ja esta limpo.
 * - So faz patch em quem realmente tem MEMBRO/DEPENDENTE.
 *
 * Uso (via Convex dashboard ou MCP runOneoffQuery):
 *   // 1. revisar o impacto sem escrever:
 *   await ctx.runMutation(internal.migration.limparPapeisPessoa.run, {});
 *   // 2. aplicar de verdade:
 *   await ctx.runMutation(internal.migration.limparPapeisPessoa.run, { dryRun: false });
 *
 * Nota de escala: usa collect() da tabela `entidades` inteira (padrao das
 * migracoes one-off do projeto). Para uma igreja isso e centenas/poucos
 * milhares de docs — ok. Se `entidades` crescer muito, paginar.
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = true }) => {
    const A_REMOVER = ["MEMBRO", "DEPENDENTE"];

    const stats = {
      dryRun,
      total: 0,
      afetados: 0, // tinham MEMBRO e/ou DEPENDENTE
      tinhamMembro: 0,
      tinhamDependente: 0,
      ficaramVazios: 0, // papeis vazio apos limpeza (PF sem papel de PJ)
      mantiveramOutros: 0, // sobrou algum papel (FORNECEDOR/etc) apos limpeza
    };

    const entidades = await ctx.db.query("entidades").collect();
    stats.total = entidades.length;

    for (const entidade of entidades) {
      const papeis = entidade.papeis ?? [];
      const temMembro = papeis.includes("MEMBRO" as never);
      const temDependente = papeis.includes("DEPENDENTE" as never);
      if (!temMembro && !temDependente) continue;

      stats.afetados++;
      if (temMembro) stats.tinhamMembro++;
      if (temDependente) stats.tinhamDependente++;

      const limpos = papeis.filter((p) => !A_REMOVER.includes(p));
      if (limpos.length === 0) stats.ficaramVazios++;
      else stats.mantiveramOutros++;

      if (!dryRun) {
        await ctx.db.patch(entidade._id, {
          papeis: limpos as typeof entidade.papeis,
        });
      }
    }

    return stats;
  },
});
