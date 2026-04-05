import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Importar dados de liturgia do CSV do Notion.
 * Para cada domingo com dados, busca/cria o culto e atualiza:
 * - Escala de ABERTURA (passagemBiblica)
 * - Escala de CONFISSAO (passagemBiblica)
 * - Escala de PREGACAO (passagemBiblica + nomeCustom se não for membro)
 * - Observações (campo Notas do CSV)
 *
 * Executar: npx convex run escalas/importLiturgia:importar '{"items": [...]}'
 */
export const importar = mutation({
  args: {
    items: v.array(v.object({
      data: v.string(), // YYYY-MM-DD
      notas: v.optional(v.string()),
      abertura: v.optional(v.string()),
      confissao: v.optional(v.string()),
      palavra: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { items }) => {
    let updated = 0;
    let created = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.data) { skipped++; continue; }

      // Buscar culto pela data
      let culto = await ctx.db
        .query("cultos")
        .withIndex("by_data", (q) => q.eq("data", item.data))
        .first();

      if (!culto) {
        // Criar culto
        const id = await ctx.db.insert("cultos", {
          data: item.data,
          tipo: "DOMINICAL",
          status: "RASCUNHO",
          observacoes: item.notas || undefined,
        });
        culto = await ctx.db.get(id);
        created++;
      } else {
        // Atualizar observações se houver
        if (item.notas) {
          await ctx.db.patch(culto._id, { observacoes: item.notas });
        }
        updated++;
      }

      if (!culto) continue;

      // Upsert escalas de liturgia
      const funcoes = [
        { funcao: "ABERTURA", passagem: item.abertura },
        { funcao: "CONFISSAO", passagem: item.confissao },
        { funcao: "PREGACAO", passagem: item.palavra },
      ];

      for (const { funcao, passagem } of funcoes) {
        if (!passagem) continue;

        const existing = await ctx.db
          .query("cultoEscalas")
          .withIndex("by_culto_funcao", (q: any) =>
            q.eq("cultoId", culto!._id).eq("funcao", funcao)
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, { passagemBiblica: passagem.trim() });
        } else {
          await ctx.db.insert("cultoEscalas", {
            cultoId: culto._id,
            funcao,
            passagemBiblica: passagem.trim(),
          });
        }
      }
    }

    return { updated, created, skipped, total: items.length };
  },
});
