import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs, createActionAuditLog } from "../_shared/auditHelpers";

export const create = mutation({
  args: {
    titulo: v.string(),
    artista: v.optional(v.string()),
    tom: v.optional(v.string()),
    tomHomem: v.optional(v.string()),
    tomMulher: v.optional(v.string()),
    bpm: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    conteudo: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    estrutura: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const id = await ctx.db.insert("louvores", {
      ...args,
      status: "ATIVO",
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "louvores", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("louvores"),
    data: v.any(),
  },
  handler: async (ctx, { id, data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Louvor nao encontrado");

    await ctx.db.patch(id, { ...data, atualizadoEm: Date.now() });
    const newRecord = await ctx.db.get(id);

    await createFieldAuditLogs(ctx, oldRecord, newRecord, "louvores", id);
    return id;
  },
});

// Seed para import em massa (sem auth)
export const seed = internalMutation({
  args: {
    titulo: v.string(),
    artista: v.optional(v.string()),
    tom: v.optional(v.string()),
    bpm: v.optional(v.number()),
    conteudo: v.optional(v.string()),
    estrutura: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Evitar duplicatas por titulo
    const existing = await ctx.db
      .query("louvores")
      .withIndex("by_titulo", (q) => q.eq("titulo", args.titulo))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("louvores", {
      ...args,
      status: "ATIVO",
      criadoEm: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("louvores") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const louvor = await ctx.db.get(id);
    if (!louvor) throw new Error("Louvor nao encontrado");

    await createActionAuditLog(ctx, "DELETE", "louvores", id);
    await ctx.db.delete(id);
  },
});
