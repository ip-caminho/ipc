import { internalMutation } from "../_generated/server";

/**
 * Corrige vinculos familiares unidirecionais criados antes do espelhamento:
 * 1. Conjuges assimetricos: A aponta para B, mas B (membro) nao aponta de
 *    volta -> espelha.
 * 2. Criancas com um unico responsavel cujo responsavel tem conjuge ->
 *    adiciona o conjuge como segundo responsavel (suposicao validada com o
 *    Andre: o conjuge do responsavel tambem e responsavel pela crianca;
 *    casos excepcionais se ajustam manualmente no drawer de familia).
 *
 * Idempotente. Rodar: npx convex run membros/migrations:migrateFamiliaBidirecional
 * (em dev e prod, junto do deploy desta feature)
 */
export const migrateFamiliaBidirecional = internalMutation({
  args: {},
  handler: async (ctx) => {
    const membros = await ctx.db.query("membros").collect();
    const porEntidade = new Map(membros.map((m) => [m.entidadeId, m]));

    // 1. Espelhar conjuges assimetricos
    let conjugesEspelhados = 0;
    for (const m of membros) {
      if (!m.conjugeId) continue;
      const outro = porEntidade.get(m.conjugeId);
      if (outro && !outro.conjugeId) {
        await ctx.db.patch(outro._id, { conjugeId: m.entidadeId });
        outro.conjugeId = m.entidadeId; // mantem o cache coerente na mesma passada
        conjugesEspelhados++;
      }
    }

    // 2. Vincular o conjuge do responsavel as criancas com responsavel unico
    let responsaveisAdicionados = 0;
    const links = await ctx.db.query("responsaveis").collect();
    const porCrianca = new Map<string, typeof links>();
    for (const l of links) {
      const arr = porCrianca.get(l.criancaEntidadeId) ?? [];
      arr.push(l);
      porCrianca.set(l.criancaEntidadeId, arr);
    }
    for (const resp of porCrianca.values()) {
      if (resp.length !== 1) continue;
      const unico = resp[0];
      const respMembro = porEntidade.get(unico.responsavelEntidadeId);
      const conjugeEntId = respMembro?.conjugeId;
      if (!conjugeEntId || conjugeEntId === unico.criancaEntidadeId) continue;

      const conjugeEntidade = await ctx.db.get(conjugeEntId);
      const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
        conjugeEntidade?.sexo === "M" ? "PAI" : conjugeEntidade?.sexo === "F" ? "MAE" : "RESPONSAVEL";
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: unico.criancaEntidadeId,
        responsavelEntidadeId: conjugeEntId,
        tipo,
        principal: false,
        criadoEm: Date.now(),
      });
      responsaveisAdicionados++;
    }

    return { conjugesEspelhados, responsaveisAdicionados };
  },
});
