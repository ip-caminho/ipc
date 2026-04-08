import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { createActionAuditLog } from "../_shared/auditHelpers";
import { requirePermission } from "../_shared/requirePermission";

export const create = mutation({
  args: {
    nome: v.string(),
    descricao: v.optional(v.string()),
    liderId: v.id("membros"),
    coliderId: v.optional(v.id("membros")),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "pequenos_grupos:create");

    const id = await ctx.db.insert("pequenosGrupos", {
      ...args,
      status: "ATIVO",
    });

    await createActionAuditLog(ctx, "CREATE", "pequenosGrupos", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("pequenosGrupos"),
    nome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    liderId: v.optional(v.id("membros")),
    coliderId: v.optional(v.id("membros")),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
    status: v.optional(v.union(v.literal("ATIVO"), v.literal("INATIVO"))),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    const pg = await ctx.db.get(id);
    if (!pg) throw new Error("Pequeno grupo nao encontrado");

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("pequenosGrupos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "pequenos_grupos:delete");

    const pg = await ctx.db.get(id);
    if (!pg) throw new Error("Pequeno grupo nao encontrado");

    // Cascade delete membros do PG
    const membros = await ctx.db
      .query("pgMembros")
      .withIndex("by_pg", (q) => q.eq("pgId", id))
      .collect();
    for (const m of membros) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "pequenosGrupos", id);
  },
});

export const addMembro = mutation({
  args: {
    pgId: v.id("pequenosGrupos"),
    membroId: v.id("membros"),
  },
  handler: async (ctx, { pgId, membroId }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    const pg = await ctx.db.get(pgId);
    if (!pg) throw new Error("Pequeno grupo nao encontrado");

    // Check if already exists
    const existing = await ctx.db
      .query("pgMembros")
      .withIndex("by_pg", (q) => q.eq("pgId", pgId))
      .collect();

    if (existing.some((e) => e.membroId === membroId)) {
      throw new Error("Membro ja esta neste PG");
    }

    return await ctx.db.insert("pgMembros", { pgId, membroId });
  },
});

export const moveMembro = mutation({
  args: {
    membroId: v.id("membros"),
    fromPgId: v.optional(v.id("pequenosGrupos")),
    toPgId: v.optional(v.id("pequenosGrupos")),
  },
  handler: async (ctx, { membroId, fromPgId, toPgId }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    if (fromPgId === toPgId) return;

    // Remove do PG de origem
    if (fromPgId) {
      const existing = await ctx.db
        .query("pgMembros")
        .withIndex("by_pg", (q) => q.eq("pgId", fromPgId))
        .collect();
      const record = existing.find((e) => e.membroId === membroId);
      if (record) {
        await ctx.db.delete(record._id);
      }
    }

    // Adiciona ao PG de destino
    if (toPgId) {
      const pg = await ctx.db.get(toPgId);
      if (!pg) throw new Error("PG de destino nao encontrado");

      // Verifica duplicidade
      const existingInTarget = await ctx.db
        .query("pgMembros")
        .withIndex("by_pg", (q) => q.eq("pgId", toPgId))
        .collect();

      if (!existingInTarget.some((e) => e.membroId === membroId)) {
        await ctx.db.insert("pgMembros", { pgId: toPgId, membroId });
      }
    }
  },
});

export const removeMembro = mutation({
  args: { id: v.id("pgMembros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    const pgMembro = await ctx.db.get(id);
    if (!pgMembro) throw new Error("Registro nao encontrado");

    await ctx.db.delete(id);
  },
});

// ===== Encontros e Presenca =====

export const createEncontro = mutation({
  args: {
    pgId: v.id("pequenosGrupos"),
    data: v.string(),
    tema: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    presentes: v.array(v.id("membros")),
  },
  handler: async (ctx, { pgId, data, tema, observacoes, presentes }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    const pg = await ctx.db.get(pgId);
    if (!pg) throw new Error("Pequeno grupo nao encontrado");

    // Valida unicidade pgId+data
    const existing = await ctx.db
      .query("pgEncontros")
      .withIndex("by_pg_data", (q) => q.eq("pgId", pgId).eq("data", data))
      .first();
    if (existing) throw new Error("Ja existe um encontro nesta data para este PG");

    const encontroId = await ctx.db.insert("pgEncontros", {
      pgId,
      data,
      tema: tema || undefined,
      observacoes: observacoes || undefined,
      criadoEm: Date.now(),
    });

    for (const membroId of presentes) {
      await ctx.db.insert("pgPresencas", { encontroId, membroId });
    }

    return encontroId;
  },
});

export const updateEncontroPresencas = mutation({
  args: {
    encontroId: v.id("pgEncontros"),
    data: v.optional(v.string()),
    tema: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    presentes: v.array(v.id("membros")),
  },
  handler: async (ctx, { encontroId, data, tema, observacoes, presentes }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    const encontro = await ctx.db.get(encontroId);
    if (!encontro) throw new Error("Encontro nao encontrado");

    // Atualiza dados do encontro
    const updates: Record<string, any> = {};
    if (data !== undefined) updates.data = data;
    if (tema !== undefined) updates.tema = tema || undefined;
    if (observacoes !== undefined) updates.observacoes = observacoes || undefined;
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(encontroId, updates);
    }

    // Recria presencas
    const existingPresencas = await ctx.db
      .query("pgPresencas")
      .withIndex("by_encontro", (q) => q.eq("encontroId", encontroId))
      .collect();
    for (const p of existingPresencas) {
      await ctx.db.delete(p._id);
    }
    for (const membroId of presentes) {
      await ctx.db.insert("pgPresencas", { encontroId, membroId });
    }
  },
});

export const removeEncontro = mutation({
  args: { encontroId: v.id("pgEncontros") },
  handler: async (ctx, { encontroId }) => {
    await requirePermission(ctx, "pequenos_grupos:update");

    const encontro = await ctx.db.get(encontroId);
    if (!encontro) throw new Error("Encontro nao encontrado");

    // Cascade: remove presencas
    const presencas = await ctx.db
      .query("pgPresencas")
      .withIndex("by_encontro", (q) => q.eq("encontroId", encontroId))
      .collect();
    for (const p of presencas) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(encontroId);
  },
});
