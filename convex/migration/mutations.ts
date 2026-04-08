import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Limpar todos os documentos de uma tabela
export const clearTable = mutation({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    const docs = await ctx.db.query(table as any).collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return docs.length;
  },
});

// Inserir documento genérico
export const insertDoc = mutation({
  args: { table: v.string(), doc: v.any() },
  handler: async (ctx, { table, doc }) => {
    return await ctx.db.insert(table as any, doc);
  },
});

// Atualizar documento existente
export const patchDoc = mutation({
  args: { id: v.string(), patch: v.any() },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id as any, patch);
  },
});

// Deletar documento por ID
export const deleteDoc = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id as any);
  },
});

// Inserir batch de documentos
export const insertBatch = mutation({
  args: { table: v.string(), docs: v.array(v.any()) },
  handler: async (ctx, { table, docs }) => {
    const ids = [];
    for (const doc of docs) {
      const id = await ctx.db.insert(table as any, doc);
      ids.push(id);
    }
    return ids;
  },
});
