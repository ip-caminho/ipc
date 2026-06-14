import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";

export const list = query({
  args: {
    ministerioId: v.optional(v.id("ministerios")),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "calendario:read");

    // Os consumidores sempre passam um intervalo de data (mes / a partir de
    // hoje), entao o by_data e o caminho mais seletivo. Filtros restantes rodam
    // em memoria sobre o subconjunto — sem varrer a tabela toda.
    let eventos: Doc<"calendarioEventos">[];
    if (args.dataInicio || args.dataFim) {
      const { dataInicio, dataFim } = args;
      eventos = await ctx.db
        .query("calendarioEventos")
        .withIndex("by_data", (q) => {
          if (dataInicio && dataFim) return q.gte("data", dataInicio).lte("data", dataFim);
          if (dataInicio) return q.gte("data", dataInicio);
          return q.lte("data", dataFim!);
        })
        .collect();
    } else if (args.ministerioId) {
      const ministerioId = args.ministerioId;
      eventos = await ctx.db
        .query("calendarioEventos")
        .withIndex("by_ministerio", (q) => q.eq("ministerioId", ministerioId))
        .collect();
    } else {
      eventos = await ctx.db.query("calendarioEventos").collect();
    }

    if (args.ministerioId) {
      eventos = eventos.filter((e) => e.ministerioId === args.ministerioId);
    }

    if (args.dataInicio) {
      eventos = eventos.filter((e) => e.data >= args.dataInicio!);
    }

    if (args.dataFim) {
      eventos = eventos.filter((e) => e.data <= args.dataFim!);
    }

    // Enrich with ministerio name
    const enriched = await Promise.all(
      eventos.map(async (evento) => {
        let ministerioNome: string | null = null;
        if (evento.ministerioId) {
          const min = await ctx.db.get(evento.ministerioId);
          ministerioNome = min?.nome ?? null;
        }
        return { ...evento, ministerioNome };
      })
    );

    return enriched.sort((a, b) => a.data.localeCompare(b.data));
  },
});

export const getById = query({
  args: { id: v.id("calendarioEventos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "calendario:read");

    const evento = await ctx.db.get(id);
    if (!evento) return null;

    let ministerioNome: string | null = null;
    if (evento.ministerioId) {
      const min = await ctx.db.get(evento.ministerioId);
      ministerioNome = min?.nome ?? null;
    }

    return { ...evento, ministerioNome };
  },
});
