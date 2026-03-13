import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    tipo: v.optional(v.string()),
    pregadorId: v.optional(v.id("membros")),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("gravacoes").order("desc").collect();

    if (args.tipo) {
      results = results.filter((g) => g.tipo === args.tipo);
    }
    if (args.pregadorId) {
      results = results.filter((g) => g.pregadorId === args.pregadorId);
    }
    if (args.status) {
      results = results.filter((g) => g.status === args.status);
    }
    if (args.search) {
      const term = args.search.toLowerCase();
      results = results.filter((g) => {
        return (
          g.titulo.toLowerCase().includes(term) ||
          (g.pregadorNome || "").toLowerCase().includes(term) ||
          (g.textoBase || "").toLowerCase().includes(term) ||
          (g.tags || []).some((t) => t.toLowerCase().includes(term))
        );
      });
    }

    // Enrich with pregador info + serie info
    return Promise.all(
      results.map(async (g) => {
        let pregadorInfo = null;
        if (g.pregadorId) {
          const membro = await ctx.db.get(g.pregadorId);
          if (membro) {
            const entidade = await ctx.db.get(membro.entidadeId);
            pregadorInfo = { nome: entidade?.nomeCompleto || "" };
          }
        }
        let serieInfo = null;
        if (g.serieId) {
          const serie = await ctx.db.get(g.serieId);
          if (serie) {
            serieInfo = { nome: serie.nome };
          }
        }
        // Reacoes summary
        const reacoes = await ctx.db
          .query("reacoesGravacao")
          .withIndex("by_gravacao", (q) => q.eq("gravacaoId", g._id))
          .collect();
        const reacoesSummary: { tipo: string; count: number }[] = [];
        const counts: Record<string, number> = {};
        for (const r of reacoes) {
          counts[r.tipo] = (counts[r.tipo] || 0) + 1;
        }
        for (const [tipo, count] of Object.entries(counts)) {
          reacoesSummary.push({ tipo, count });
        }

        // Comment count
        const comentarios = await ctx.db
          .query("comentariosGravacao")
          .withIndex("by_gravacao", (q) => q.eq("gravacaoId", g._id))
          .collect();

        return { ...g, pregadorInfo, serieInfo, reacoesSummary, comentarioCount: comentarios.length };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("gravacoes") },
  handler: async (ctx, { id }) => {
    const gravacao = await ctx.db.get(id);
    if (!gravacao) return null;

    let pregadorInfo = null;
    if (gravacao.pregadorId) {
      const membro = await ctx.db.get(gravacao.pregadorId);
      if (membro) {
        const entidade = await ctx.db.get(membro.entidadeId);
        pregadorInfo = { nome: entidade?.nomeCompleto || "" };
      }
    }

    let serieInfo = null;
    if (gravacao.serieId) {
      const serie = await ctx.db.get(gravacao.serieId);
      if (serie) {
        serieInfo = { nome: serie.nome };
      }
    }

    return { ...gravacao, pregadorInfo, serieInfo };
  },
});
