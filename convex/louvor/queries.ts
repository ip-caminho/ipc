import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    search: v.optional(v.string()),
    tag: v.optional(v.string()),
    tom: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("louvores").collect();

    if (args.status) {
      results = results.filter((l) => l.status === args.status);
    }
    if (args.tag) {
      results = results.filter((l) => (l.tags || []).includes(args.tag!));
    }
    if (args.tom) {
      results = results.filter((l) => l.tom === args.tom);
    }
    if (args.search) {
      const term = args.search.toLowerCase();
      results = results.filter((l) => {
        return (
          l.titulo.toLowerCase().includes(term) ||
          (l.artista || "").toLowerCase().includes(term) ||
          (l.conteudo || "").toLowerCase().includes(term) ||
          (l.tags || []).some((t) => t.toLowerCase().includes(term))
        );
      });
    }

    results.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    return results;
  },
});

export const getById = query({
  args: { id: v.id("louvores") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    if (!q || q.length < 2) return [];

    const results = await ctx.db
      .query("louvores")
      .withSearchIndex("search_louvores", (s) =>
        s.search("titulo", q).eq("status", "ATIVO")
      )
      .take(10);

    return results.map((l) => ({
      _id: l._id,
      titulo: l.titulo,
      artista: l.artista,
      tom: l.tom,
    }));
  },
});

export const getByTitulos = query({
  args: { titulos: v.array(v.string()) },
  handler: async (ctx, { titulos }) => {
    if (titulos.length === 0) return [];
    const all = await ctx.db.query("louvores").collect();
    const results: Array<{ titulo: string; conteudo?: string; tom?: string; artista?: string }> = [];
    for (const titulo of titulos) {
      const lower = titulo.toLowerCase();
      const found = all.find((l) => l.titulo.toLowerCase() === lower);
      if (found) {
        results.push({ titulo, conteudo: found.conteudo, tom: found.tom, artista: found.artista });
      }
    }
    return results;
  },
});

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const louvores = await ctx.db.query("louvores").collect();
    const counts: Record<string, number> = {};
    for (const l of louvores) {
      if (l.status !== "ATIVO") continue;
      for (const tag of l.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  },
});
