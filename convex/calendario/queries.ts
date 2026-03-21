import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    ministerioId: v.optional(v.id("ministerios")),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let eventos = await ctx.db.query("calendarioEventos").collect();

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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

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
