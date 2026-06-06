import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Espelha o vinculo de conjuge no outro lado: se a entidade-alvo tem registro
 * de membro e ainda nao tem conjuge, aponta de volta. Vinculos de conjuge
 * devem ser sempre bilaterais — sem isso, o perfil do outro lado nao mostra
 * a familia.
 */
export async function espelharConjuge(
  ctx: MutationCtx,
  minhaEntidadeId: Id<"entidades">,
  conjugeEntidadeId: Id<"entidades">,
): Promise<void> {
  const conjugeMembro = await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q) => q.eq("entidadeId", conjugeEntidadeId))
    .first();
  if (conjugeMembro && !conjugeMembro.conjugeId) {
    await ctx.db.patch(conjugeMembro._id, { conjugeId: minhaEntidadeId });
  }
}

/**
 * Limpa o espelho do vinculo antigo (usado quando um membro troca ou remove
 * o conjuge): se o ex-conjuge ainda aponta de volta, desfaz.
 */
export async function limparEspelhoConjuge(
  ctx: MutationCtx,
  minhaEntidadeId: Id<"entidades">,
  exConjugeEntidadeId: Id<"entidades">,
): Promise<void> {
  const exMembro = await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q) => q.eq("entidadeId", exConjugeEntidadeId))
    .first();
  if (exMembro && exMembro.conjugeId === minhaEntidadeId) {
    await ctx.db.patch(exMembro._id, { conjugeId: undefined });
  }
}

/**
 * Vincula a crianca tambem ao conjuge do responsavel (se houver), sem
 * duplicar. Filhos pertencem ao casal: sem isso, a crianca so aparece na
 * familia de quem cadastrou.
 */
export async function vincularCriancaAoConjuge(
  ctx: MutationCtx,
  responsavelEntidadeId: Id<"entidades">,
  criancaEntidadeId: Id<"entidades">,
): Promise<void> {
  const respMembro = await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q) => q.eq("entidadeId", responsavelEntidadeId))
    .first();
  const conjugeEntId = respMembro?.conjugeId;
  if (!conjugeEntId || conjugeEntId === criancaEntidadeId) return;

  const existentes = await ctx.db
    .query("responsaveis")
    .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", criancaEntidadeId))
    .collect();
  if (existentes.some((r) => r.responsavelEntidadeId === conjugeEntId)) return;

  const conjugeEntidade = await ctx.db.get(conjugeEntId);
  const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
    conjugeEntidade?.sexo === "M" ? "PAI" : conjugeEntidade?.sexo === "F" ? "MAE" : "RESPONSAVEL";
  await ctx.db.insert("responsaveis", {
    criancaEntidadeId,
    responsavelEntidadeId: conjugeEntId,
    tipo,
    principal: false,
    criadoEm: Date.now(),
  });
}
