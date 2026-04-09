import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

export const create = mutation({
  args: {
    titulo: v.string(),
    descricao: v.optional(v.string()),
    dataInicio: v.string(),
    dataFim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "escalas:create");

    const id = await ctx.db.insert("avisos", {
      ...args,
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "avisos", id as string);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("avisos"),
    titulo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "escalas:update");

    const aviso = await ctx.db.get(id);
    if (!aviso) throw new Error("Aviso nao encontrado");

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    cleanUpdates.atualizadoEm = Date.now();
    await ctx.db.patch(id, cleanUpdates);

    const updated = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, aviso, updated, "avisos");
  },
});

export const remove = mutation({
  args: { id: v.id("avisos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:delete");

    const aviso = await ctx.db.get(id);
    if (!aviso) throw new Error("Aviso nao encontrado");

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "avisos", id as string);
  },
});
