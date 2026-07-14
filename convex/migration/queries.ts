import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Query genérica para ler todos os documentos de uma tabela.
// INTERNAL: acesso genérico a qualquer tabela — nunca pode ser público.
export const readTable = internalQuery({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    return await ctx.db.query(table as any).collect();
  },
});

// Contar documentos de uma tabela
export const countTable = internalQuery({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    const docs = await ctx.db.query(table as any).collect();
    return docs.length;
  },
});
