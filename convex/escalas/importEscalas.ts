import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Importar escalas do CSV do Notion.
 * Para cada domingo, busca/cria culto e upsert escalas por função.
 * Membros são buscados por ID. Convidados são criados como entidade CONVIDADO.
 */
export const importar = mutation({
  args: {
    items: v.array(v.object({
      data: v.string(),
      abertura: v.optional(v.string()),    // membroId ou nome convidado
      confissao: v.optional(v.string()),   // membroId ou nome convidado
      pregador: v.optional(v.string()),    // membroId ou "custom:Nome Convidado"
      oracao: v.optional(v.string()),      // membroId ou "custom:Nome"
      multimidia: v.optional(v.string()),  // membroId ou "custom:Nome"
      louvor: v.optional(v.array(v.string())), // array de membroIds
    })),
  },
  handler: async (ctx, { items }) => {
    let updated = 0;
    let created = 0;
    const convidadosCriados = 0;

    // Cache de convidados já criados nesta execução
    const convidadosCache = new Map<string, string>(); // nome → membroId

    async function resolveEscalado(value: string | undefined): Promise<{ membroId?: string; nomeCustom?: string } | null> {
      if (!value) return null;

      if (value.startsWith("custom:")) {
        const nome = value.slice(7).trim();
        if (!nome) return null;
        return { nomeCustom: nome };
      }

      // É um membroId
      return { membroId: value };
    }

    for (const item of items) {
      if (!item.data) continue;

      // Buscar/criar culto
      let culto = await ctx.db
        .query("cultos")
        .withIndex("by_data", (q) => q.eq("data", item.data))
        .first();

      if (!culto) {
        const id = await ctx.db.insert("cultos", {
          data: item.data,
          tipo: "DOMINICAL",
          status: "RASCUNHO",
        });
        culto = await ctx.db.get(id);
        created++;
      } else {
        updated++;
      }

      if (!culto) continue;

      // Funções singulares (ABERTURA, CONFISSAO, PREGACAO, ORACAO, MULTIMIDIA)
      const singulares = [
        { funcao: "ABERTURA", valor: item.abertura },
        { funcao: "CONFISSAO", valor: item.confissao },
        { funcao: "PREGACAO", valor: item.pregador },
        { funcao: "ORACAO", valor: item.oracao },
        { funcao: "MULTIMIDIA", valor: item.multimidia },
      ];

      for (const { funcao, valor } of singulares) {
        const resolved = await resolveEscalado(valor);
        if (!resolved) continue;

        const existing = await ctx.db
          .query("cultoEscalas")
          .withIndex("by_culto_funcao", (q: any) =>
            q.eq("cultoId", culto!._id).eq("funcao", funcao)
          )
          .first();

        const data: any = {};
        if (resolved.membroId) data.membroId = resolved.membroId;
        if (resolved.nomeCustom) data.nomeCustom = resolved.nomeCustom;

        if (existing) {
          await ctx.db.patch(existing._id, data);
        } else {
          await ctx.db.insert("cultoEscalas", {
            cultoId: culto._id,
            funcao,
            ...data,
          });
        }
      }

      // LOUVOR (múltiplo)
      if (item.louvor && item.louvor.length > 0) {
        // Remover escalas de louvor existentes para este culto
        const existingLouvor = await ctx.db
          .query("cultoEscalas")
          .withIndex("by_culto_funcao", (q: any) =>
            q.eq("cultoId", culto!._id).eq("funcao", "LOUVOR")
          )
          .collect();
        for (const e of existingLouvor) {
          await ctx.db.delete(e._id);
        }

        // Inserir novos
        for (const membroId of item.louvor) {
          await ctx.db.insert("cultoEscalas", {
            cultoId: culto._id,
            funcao: "LOUVOR",
            membroId: membroId as any,
          });
        }
      }
    }

    return { updated, created, convidadosCriados, total: items.length };
  },
});
