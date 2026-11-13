import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { requirePermission } from "../_shared/requirePermission";

export const create = mutation({
  args: {
    nome: v.string(),
    descricao: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
    papeis: v.array(v.string()),
    subgrupos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "ministerios:create");

    const id = await ctx.db.insert("ministerios", {
      ...args,
      status: "ATIVO",
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "ministerios", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("ministerios"),
    nome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
    papeis: v.optional(v.array(v.string())),
    subgrupos: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("ATIVO"), v.literal("INATIVO"))),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "ministerios:update");

    const ministerio = await ctx.db.get(id);
    if (!ministerio) throw new Error("Ministério não encontrado");

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(id, cleanUpdates);

    const updated = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, ministerio, updated, "ministerios");
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("ministerios") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "ministerios:delete");

    const ministerio = await ctx.db.get(id);
    if (!ministerio) throw new Error("Ministério não encontrado");

    // Cascade delete membros do ministerio
    const membros = await ctx.db
      .query("ministerioMembros")
      .withIndex("by_ministerio", (q) => q.eq("ministerioId", id))
      .collect();
    for (const m of membros) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "ministerios", id);
  },
});

export const addMembro = mutation({
  args: {
    ministerioId: v.id("ministerios"),
    membroId: v.id("membros"),
    papel: v.string(),
    subgrupos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { ministerioId, membroId, papel, subgrupos }) => {
    await requirePermission(ctx, "ministerios:update");

    const ministerio = await ctx.db.get(ministerioId);
    if (!ministerio) throw new Error("Ministério não encontrado");

    // Check if already exists
    const existing = await ctx.db
      .query("ministerioMembros")
      .withIndex("by_ministerio_membro", (q) =>
        q.eq("ministerioId", ministerioId).eq("membroId", membroId)
      )
      .first();

    if (existing) {
      throw new Error("Membro já está neste ministério");
    }

    const id = await ctx.db.insert("ministerioMembros", {
      ministerioId,
      membroId,
      papel,
      subgrupos,
      status: "ATIVO",
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "ADD_MEMBRO", "ministerioMembros", id as string);
    return id;
  },
});

export const updateMembro = mutation({
  args: {
    id: v.id("ministerioMembros"),
    papel: v.optional(v.string()),
    subgrupos: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("ATIVO"), v.literal("INATIVO"))),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "ministerios:update");

    const mm = await ctx.db.get(id);
    if (!mm) throw new Error("Registro não encontrado");

    const cleanUpdates: Record<string, any> = { atualizadoEm: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(id, cleanUpdates);
  },
});

export const removeMembro = mutation({
  args: { id: v.id("ministerioMembros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "ministerios:update");

    const mm = await ctx.db.get(id);
    if (!mm) throw new Error("Registro não encontrado");

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "REMOVE_MEMBRO", "ministerioMembros", id as string);
  },
});

// INTERNAL: seed — rodar via `npx convex run`, nunca do cliente.
export const seedMinisterios = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seeds = [
      { nome: "Educacional Infantil", descricao: "Ministério de educação para crianças", papeis: ["Coordenador", "Professor", "Auxiliar"] },
      { nome: "Louvor", descricao: "Ministério de louvor e adoração", papeis: ["Coordenador", "Vocalista", "Instrumentista"] },
      { nome: "Som", descricao: "Ministério de sonorização", papeis: ["Coordenador", "Operador"] },
      { nome: "Hospitalidade", descricao: "Ministério de recepção e acolhimento", papeis: ["Coordenador", "Recepcionista"] },
      { nome: "Multimídia", descricao: "Ministério de mídia e comunicação", papeis: ["Coordenador", "Operador", "Designer"] },
    ];

    // Compara sem acento para não duplicar ministério já gravado com a grafia antiga
    const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const existing = await ctx.db.query("ministerios").collect();

    for (const seed of seeds) {
      if (existing.some((m) => semAcento(m.nome) === semAcento(seed.nome))) continue;

      await ctx.db.insert("ministerios", {
        ...seed,
        status: "ATIVO",
        criadoEm: Date.now(),
      });
    }
  },
});

