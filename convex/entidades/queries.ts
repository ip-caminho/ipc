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
    let results = args.tipo
      ? await ctx.db.query("entidades").withIndex("by_tipo", (q) => q.eq("tipoEntidade", args.tipo!)).collect()
      : await ctx.db.query("entidades").collect();

    if (args.status) {
      results = results.filter((e) => e.status === args.status);
    }
    if (args.papel) {
      results = results.filter((e) => e.papeis.includes(args.papel as any));
    }
    if (args.search) {
      const term = args.search.toLowerCase();
      results = results.filter((e) => {
        const name = (e.nomeCompleto || e.nomeRazaoSocial || "").toLowerCase();
        const phone = (e.whatsapp || "").toLowerCase();
        const email = (e.email || "").toLowerCase();
        return name.includes(term) || phone.includes(term) || email.includes(term);
      });
    }

    return results;
  },
});

export const getById = query({
  args: { id: v.id("entidades") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
