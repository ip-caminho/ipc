import { query } from "../_generated/server";
import { v } from "convex/values";

// Query genérica para ler todos os documentos de uma tabela
export const readTable = query({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    return await ctx.db.query(table as any).collect();
  },
});

// Contar documentos de uma tabela
export const countTable = query({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    const docs = await ctx.db.query(table as any).collect();
    return docs.length;
  },
});
