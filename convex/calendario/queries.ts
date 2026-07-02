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

// Pregadores dos cultos num intervalo (para o toggle "Pregadores" do calendario).
// Retorna [{ data, nome }] — nome vem do membro escalado em PREGACAO ou do
// nomeCustom (pregador externo). Exige calendario:read (mesma da agenda).
export const pregadores = query({
  args: {
    dataInicio: v.string(),
    dataFim: v.string(),
  },
  handler: async (ctx, { dataInicio, dataFim }) => {
    await requirePermission(ctx, "calendario:read");

    const cultos = await ctx.db
      .query("cultos")
      .withIndex("by_data", (q) => q.gte("data", dataInicio).lte("data", dataFim))
      .collect();

    const resultado: { data: string; nome: string }[] = [];
    for (const culto of cultos) {
      const escala = await ctx.db
        .query("cultoEscalas")
        .withIndex("by_culto_funcao", (q) =>
          q.eq("cultoId", culto._id).eq("funcao", "PREGACAO"),
        )
        .first();
      if (!escala) continue;

      let nome = escala.nomeCustom ?? "";
      if (!nome && escala.membroId) {
        const membro = await ctx.db.get(escala.membroId);
        if (membro) {
          const entidade = await ctx.db.get(membro.entidadeId);
          nome = entidade?.nomeCompleto ?? entidade?.nomeRazaoSocial ?? "";
        }
      }
      if (nome) resultado.push({ data: culto.data, nome });
    }

    return resultado;
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
