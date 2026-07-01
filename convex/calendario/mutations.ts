import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { requirePermission } from "../_shared/requirePermission";

export const create = mutation({
  args: {
    titulo: v.string(),
    data: v.string(),
    dataFim: v.optional(v.string()),
    ministerioId: v.optional(v.id("ministerios")),
    descricao: v.optional(v.string()),
    tipo: v.optional(v.union(v.literal("pg"), v.literal("evento"), v.literal("reuniao"))),
    publicadoNoSite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "calendario:create");

    const id = await ctx.db.insert("calendarioEventos", {
      ...args,
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "calendarioEventos", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("calendarioEventos"),
    titulo: v.optional(v.string()),
    data: v.optional(v.string()),
    dataFim: v.optional(v.string()),
    ministerioId: v.optional(v.id("ministerios")),
    descricao: v.optional(v.string()),
    tipo: v.optional(v.union(v.literal("pg"), v.literal("evento"), v.literal("reuniao"))),
    publicadoNoSite: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "calendario:update");

    const evento = await ctx.db.get(id);
    if (!evento) throw new Error("Evento nao encontrado");

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(id, cleanUpdates);

    const updated = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, evento, updated, "calendarioEventos");
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("calendarioEventos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "calendario:delete");

    const evento = await ctx.db.get(id);
    if (!evento) throw new Error("Evento nao encontrado");

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "calendarioEventos", id);
  },
});
