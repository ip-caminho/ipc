import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    referenciaTabela: v.optional(v.string()),
    referenciaId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("auditLogs").order("desc");

    let results = await q.collect();

    if (args.referenciaTabela) {
      results = results.filter((l) => l.referenciaTabela === args.referenciaTabela);
    }
    if (args.referenciaId) {
      results = results.filter((l) => l.referenciaId === args.referenciaId);
    }

    const limit = args.limit || 50;
    return results.slice(0, limit);
  },
});
