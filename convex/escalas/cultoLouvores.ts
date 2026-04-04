import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";

// Item do setlist enviado pelo frontend
const cultoLouvorItemValidator = v.object({
  louvorId: v.optional(v.id("louvores")),
  tituloLegado: v.optional(v.string()),
  tom: v.optional(v.string()),
  secao: v.optional(v.string()),
});

/**
 * Substitui todos os louvores de um culto (dual-write).
 * 1. Deleta cultoLouvores existentes
 * 2. Insere novos com ordem sequencial
 * 3. Gera string[] legado e atualiza cultos.louvores
 */
export const setCultoLouvores = mutation({
  args: {
    cultoId: v.id("cultos"),
    items: v.array(cultoLouvorItemValidator),
  },
  handler: async (ctx, { cultoId, items }) => {
    await requirePermission(ctx, "escalas:update");

    const culto = await ctx.db.get(cultoId);
    if (!culto) throw new Error("Culto nao encontrado");

    // 1. Deletar existentes
    const existing = await ctx.db
      .query("cultoLouvores")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();
    for (const e of existing) {
      await ctx.db.delete(e._id);
    }

    // 2. Inserir novos
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await ctx.db.insert("cultoLouvores", {
        cultoId,
        louvorId: item.louvorId,
        tituloLegado: item.tituloLegado,
        ordem: i,
        tom: item.tom,
        secao: item.secao,
      });
    }

    // 3. Dual-write: gerar string[] legado
    const legacyLouvores: string[] = [];
    for (const item of items) {
      if (!item.louvorId && item.secao) {
        // Separador
        legacyLouvores.push(`---${item.secao}`);
      } else if (item.tituloLegado) {
        legacyLouvores.push(item.tituloLegado);
      } else if (item.louvorId) {
        const louvor = await ctx.db.get(item.louvorId);
        legacyLouvores.push(louvor?.titulo || "???");
      }
    }
    await ctx.db.patch(cultoId, { louvores: legacyLouvores });
  },
});

/** Atualizar apenas o tom de um item do setlist */
export const updateCultoLouvorTom = mutation({
  args: {
    id: v.id("cultoLouvores"),
    tom: v.string(),
  },
  handler: async (ctx, { id, tom }) => {
    await requirePermission(ctx, "escalas:update");
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item nao encontrado");
    await ctx.db.patch(id, { tom });
  },
});

/** Buscar louvores de um culto, enriquecidos com dados do louvor */
export const getCultoLouvoresEnriched = query({
  args: { cultoId: v.id("cultos") },
  handler: async (ctx, { cultoId }) => {
    const items = await ctx.db
      .query("cultoLouvores")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    // Ordenar por campo ordem
    items.sort((a, b) => a.ordem - b.ordem);

    const enriched = [];
    for (const item of items) {
      let titulo = item.tituloLegado || "";
      let artista: string | undefined;
      let tomOriginal: string | undefined;

      if (item.louvorId) {
        const louvor = await ctx.db.get(item.louvorId);
        if (louvor) {
          titulo = louvor.titulo;
          artista = louvor.artista;
          tomOriginal = louvor.tom;
        }
      }

      enriched.push({
        _id: item._id,
        louvorId: item.louvorId || null,
        titulo,
        artista: artista || null,
        tomOriginal: tomOriginal || null,
        tomEscolhido: item.tom || null,
        secao: item.secao || null,
        ordem: item.ordem,
      });
    }

    return enriched;
  },
});
