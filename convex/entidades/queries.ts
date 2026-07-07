import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    tipo: v.optional(v.union(v.literal("PF"), v.literal("PJ"))),
    papel: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.tipo) {
      results = await ctx.db
        .query("entidades")
        .withIndex("by_tipo", (q) => q.eq("tipoEntidade", args.tipo!))
        .collect();
    } else if (args.status) {
      results = await ctx.db
        .query("entidades")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    } else {
      results = await ctx.db.query("entidades").collect();
    }

    // Mantem o filtro em memoria para cobrir o caso tipo+status juntos.
    if (args.status) {
      results = results.filter((e) => e.status === args.status);
    }
    if (args.papel) {
      results = results.filter((e) => e.papeis.includes(args.papel as any));
    }
    if (args.search) {
      results = filtrarPorBusca(results, args.search);
    }

    return results;
  },
});

/**
 * Contatos e visitantes: entidades PF que NAO tem linha em `membros`.
 * Fonte de verdade da membresia e a linha em `membros` (nao `vinculoIgreja`
 * nem `papeis`), entao cruzamos PF x membros aqui. Escala de igreja (poucas
 * centenas), tela administrativa de baixa frequencia — collect() aceitavel.
 */
export const listNaoMembros = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pf = await ctx.db
      .query("entidades")
      .withIndex("by_tipo", (q) => q.eq("tipoEntidade", "PF"))
      .collect();

    const membros = await ctx.db.query("membros").collect();
    const idsComMembro = new Set(membros.map((m) => m.entidadeId));

    let results = pf.filter((e) => !idsComMembro.has(e._id));
    if (args.search) {
      results = filtrarPorBusca(results, args.search);
    }
    return results;
  },
});

function filtrarPorBusca<T extends {
  nomeCompleto?: string;
  nomeRazaoSocial?: string;
  nomeFantasia?: string;
  whatsapp?: string;
  telefone?: string;
  email?: string;
}>(items: T[], search: string): T[] {
  const term = search.toLowerCase();
  return items.filter((e) => {
    const campos = [
      e.nomeCompleto,
      e.nomeRazaoSocial,
      e.nomeFantasia,
      e.whatsapp,
      e.telefone,
      e.email,
    ];
    return campos.some((c) => (c || "").toLowerCase().includes(term));
  });
}

export const getById = query({
  args: { id: v.id("entidades") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
