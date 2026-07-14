import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Escrita/remoção genérica em qualquer tabela — INTERNAL, nunca pode ser pública.
// Limpar todos os documentos de uma tabela
export const clearTable = internalMutation({
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
export const insertDoc = internalMutation({
  args: { table: v.string(), doc: v.any() },
  handler: async (ctx, { table, doc }) => {
    return await ctx.db.insert(table as any, doc);
  },
});

// Atualizar documento existente
export const patchDoc = internalMutation({
  args: { id: v.string(), patch: v.any() },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id as any, patch);
  },
});

// Deletar documento por ID
export const deleteDoc = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id as any);
  },
});

// Inserir batch de documentos
export const insertBatch = internalMutation({
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
