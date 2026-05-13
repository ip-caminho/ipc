import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Marca como PARADEIRO_IGNORADO os membros ativos cujo perfilAtualizadoEm
 * ultrapassou 12 meses (ou nunca foi confirmado e dataMembresia > 18 meses,
 * para nao marcar membros recem-recebidos que ainda nao confirmaram).
 *
 * Const IPB Art. 23: apos 1 ano sem contato, membro vai para rol de
 * paradeiro ignorado.
 *
 * Idempotente: nao reseta override ja definido, e nao remarca quem ja esta.
 */
const UM_ANO_MS = 365 * 24 * 60 * 60 * 1000;
const DEZOITO_MESES_MS = 18 * 30 * 24 * 60 * 60 * 1000;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const membros = await ctx.db.query("membros").collect();

    let marcados = 0;
    let pulados = 0;

    for (const membro of membros) {
      // Ja tem override (nao mexer)
      if (membro.tipoRolOverride) {
        pulados++;
        continue;
      }

      const entidade = await ctx.db.get(membro.entidadeId);
      if (!entidade) continue;
      // So mexe em quem esta no rol oficial (ATIVO)
      if (entidade.status !== "ATIVO") continue;
      // Pula nao-membros (frequentadores etc nao tem rol)
      if (entidade.vinculoIgreja && entidade.vinculoIgreja !== "MEMBRO") continue;

      const ultimaConfirmacao = entidade.perfilAtualizadoEm;
      const cadastradoHa = membro._creationTime ? now - membro._creationTime : 0;

      const inativoHaMaisDeUmAno =
        ultimaConfirmacao !== undefined &&
        now - ultimaConfirmacao > UM_ANO_MS;

      const nuncaConfirmouEMaisDe18Meses =
        ultimaConfirmacao === undefined && cadastradoHa > DEZOITO_MESES_MS;

      if (inativoHaMaisDeUmAno || nuncaConfirmouEMaisDe18Meses) {
        await ctx.db.patch(membro._id, { tipoRolOverride: "PARADEIRO_IGNORADO" });
        marcados++;
      }
    }

    return { marcados, pulados, total: membros.length };
  },
});

/**
 * Limpa override quando membro confirma o cadastro novamente.
 * Chamado automaticamente por selfService.updateMyProfile/confirmProfile.
 */
export const limparOverridePorAtualizacao = internalMutation({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    const membro = await ctx.db.get(membroId);
    if (!membro) return;
    if (membro.tipoRolOverride === "PARADEIRO_IGNORADO") {
      await ctx.db.patch(membroId, { tipoRolOverride: undefined });
    }
  },
});
