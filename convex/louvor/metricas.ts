import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Frequência de uso de cada louvor, baseado em cultoLouvores.
 * Retorna array ordenado por vezes tocada (desc).
 */
export const louvorFrequencia = query({
  args: { meses: v.optional(v.number()) },
  handler: async (ctx, { meses }) => {
    const items = await ctx.db.query("cultoLouvores").collect();
    const louvores = await ctx.db.query("louvores").collect();

    // Filtrar por período se informado
    let filteredItems = items.filter((i) => !!i.louvorId);
    if (meses) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - meses);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      // Buscar data do culto para cada item
      const cultoCache = new Map<string, string>();
      for (const item of filteredItems) {
        if (!cultoCache.has(item.cultoId)) {
          const culto = await ctx.db.get(item.cultoId);
          cultoCache.set(item.cultoId, culto?.data || "");
        }
      }
      filteredItems = filteredItems.filter((i) => {
        const data = cultoCache.get(i.cultoId) || "";
        return data >= cutoffStr;
      });
    }

    // Agregar por louvorId
    const freq = new Map<string, { count: number; ultimaData: string }>();
    const cultoDataCache = new Map<string, string>();

    for (const item of filteredItems) {
      if (!item.louvorId) continue;
      const key = item.louvorId;

      if (!cultoDataCache.has(item.cultoId)) {
        const culto = await ctx.db.get(item.cultoId);
        cultoDataCache.set(item.cultoId, culto?.data || "");
      }
      const data = cultoDataCache.get(item.cultoId) || "";

      const existing = freq.get(key);
      if (existing) {
        existing.count++;
        if (data > existing.ultimaData) existing.ultimaData = data;
      } else {
        freq.set(key, { count: 1, ultimaData: data });
      }
    }

    // Enriquecer com dados do louvor
    const louvorMap = new Map(louvores.map((l) => [l._id, l]));
    const result = [];

    for (const [louvorId, { count, ultimaData }] of freq) {
      const louvor = louvorMap.get(louvorId as any);
      if (!louvor) continue;
      result.push({
        louvorId,
        titulo: louvor.titulo,
        artista: louvor.artista || null,
        tom: louvor.tom || null,
        vezes: count,
        ultimaVez: ultimaData,
      });
    }

    result.sort((a, b) => b.vezes - a.vezes);
    return result;
  },
});

/**
 * Louvores ativos que não tocam há N meses (ou nunca tocaram).
 */
export const louvoresNaoTocados = query({
  args: { meses: v.optional(v.number()) },
  handler: async (ctx, { meses }) => {
    const louvores = await ctx.db.query("louvores").collect();
    const ativos = louvores.filter((l) => l.status === "ATIVO");
    const items = await ctx.db.query("cultoLouvores").collect();

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (meses || 3));
    const cutoffStr = cutoff.toISOString().split("T")[0];

    // Buscar última data de cada louvor
    const lastPlayed = new Map<string, string>();
    const cultoDataCache = new Map<string, string>();

    for (const item of items) {
      if (!item.louvorId) continue;

      if (!cultoDataCache.has(item.cultoId)) {
        const culto = await ctx.db.get(item.cultoId);
        cultoDataCache.set(item.cultoId, culto?.data || "");
      }
      const data = cultoDataCache.get(item.cultoId) || "";
      const existing = lastPlayed.get(item.louvorId);
      if (!existing || data > existing) {
        lastPlayed.set(item.louvorId, data);
      }
    }

    const result = [];
    for (const louvor of ativos) {
      const ultima = lastPlayed.get(louvor._id);
      if (!ultima || ultima < cutoffStr) {
        result.push({
          louvorId: louvor._id,
          titulo: louvor.titulo,
          artista: louvor.artista || null,
          tom: louvor.tom || null,
          ultimaVez: ultima || null,
        });
      }
    }

    // Nunca tocados primeiro, depois por última vez mais antiga
    result.sort((a, b) => {
      if (!a.ultimaVez && b.ultimaVez) return -1;
      if (a.ultimaVez && !b.ultimaVez) return 1;
      if (!a.ultimaVez && !b.ultimaVez) return a.titulo.localeCompare(b.titulo);
      return a.ultimaVez!.localeCompare(b.ultimaVez!);
    });

    return result;
  },
});
