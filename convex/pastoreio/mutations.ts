import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createActionAuditLog } from "../_shared/auditHelpers";
import { requirePermission } from "../_shared/requirePermission";
import { resolvePermissions } from "../preferencias/rbacHelpers";

async function getAuthContextWithPerms(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");

  const rolePerms = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("role", membro.role))
    .first();
  const permissions = resolvePermissions(
    membro.permissions,
    rolePerms?.permissions,
    membro.role
  );

  const can = (perm: string) =>
    permissions.includes("*") || permissions.includes(perm);

  return { userId, membro, can };
}

// ===== Visitas =====

export const createVisita = mutation({
  args: {
    membroId: v.id("membros"),
    visitanteId: v.id("membros"),
    data: v.string(),
    tipo: v.union(
      v.literal("DOMICILIAR"),
      v.literal("HOSPITALAR"),
      v.literal("ACOLHIMENTO"),
      v.literal("OUTRO"),
    ),
    observacoes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "pastoreio:create");

    const id = await ctx.db.insert("visitasPastorais", {
      ...args,
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "visitasPastorais", id);
    return id;
  },
});

export const updateVisita = mutation({
  args: {
    id: v.id("visitasPastorais"),
    membroId: v.optional(v.id("membros")),
    visitanteId: v.optional(v.id("membros")),
    data: v.optional(v.string()),
    tipo: v.optional(v.union(
      v.literal("DOMICILIAR"),
      v.literal("HOSPITALAR"),
      v.literal("ACOLHIMENTO"),
      v.literal("OUTRO"),
    )),
    observacoes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "pastoreio:update");

    const visita = await ctx.db.get(id);
    if (!visita) throw new Error("Visita nao encontrada");

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

export const removeVisita = mutation({
  args: { id: v.id("visitasPastorais") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "pastoreio:delete");

    const visita = await ctx.db.get(id);
    if (!visita) throw new Error("Visita nao encontrada");

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "visitasPastorais", id);
  },
});

// ===== Pedidos de Oracao =====

export const createPedidoOracao = mutation({
  args: {
    descricao: v.string(),
  },
  handler: async (ctx, { descricao }) => {
    const auth = await getAuthContextWithPerms(ctx);

    if (!auth.can("pedidos_oracao:create") && !auth.can("pastoreio:create")) {
      throw new Error("Sem permissao");
    }

    const id = await ctx.db.insert("pedidosOracao", {
      membroId: auth.membro._id,
      descricao,
      status: "ATIVO",
      criadoEm: Date.now(),
    });

    return id;
  },
});

export const updatePedidoOracao = mutation({
  args: {
    id: v.id("pedidosOracao"),
    descricao: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("ATIVO"),
      v.literal("RESPONDIDO"),
      v.literal("ARQUIVADO"),
    )),
  },
  handler: async (ctx, { id, ...updates }) => {
    const auth = await getAuthContextWithPerms(ctx);

    const pedido = await ctx.db.get(id);
    if (!pedido) throw new Error("Pedido nao encontrado");

    // Membro so pode editar os proprios, lideranca pode editar qualquer
    const isOwner = pedido.membroId === auth.membro._id;
    if (!isOwner && !auth.can("pastoreio:update")) {
      throw new Error("Sem permissao");
    }

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    cleanUpdates.atualizadoEm = Date.now();

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

export const arquivarPedidoOracao = mutation({
  args: { id: v.id("pedidosOracao") },
  handler: async (ctx, { id }) => {
    const auth = await getAuthContextWithPerms(ctx);

    const pedido = await ctx.db.get(id);
    if (!pedido) throw new Error("Pedido nao encontrado");

    const isOwner = pedido.membroId === auth.membro._id;
    if (!isOwner && !auth.can("pastoreio:update")) {
      throw new Error("Sem permissao");
    }

    await ctx.db.patch(id, {
      status: "ARQUIVADO",
      atualizadoEm: Date.now(),
    });
  },
});

// ===== Anotacoes =====

export const createAnotacao = mutation({
  args: {
    membroId: v.id("membros"),
    texto: v.string(),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "pastoreio:create");

    const id = await ctx.db.insert("anotacoesPastorais", {
      membroId: args.membroId,
      autorId: membro._id,
      texto: args.texto,
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "anotacoesPastorais", id);
    return id;
  },
});

export const updateAnotacao = mutation({
  args: {
    id: v.id("anotacoesPastorais"),
    texto: v.string(),
  },
  handler: async (ctx, { id, texto }) => {
    await requirePermission(ctx, "pastoreio:update");

    const anotacao = await ctx.db.get(id);
    if (!anotacao) throw new Error("Anotacao nao encontrada");

    await ctx.db.patch(id, {
      texto,
      atualizadoEm: Date.now(),
    });
    return id;
  },
});

export const removeAnotacao = mutation({
  args: { id: v.id("anotacoesPastorais") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "pastoreio:delete");

    const anotacao = await ctx.db.get(id);
    if (!anotacao) throw new Error("Anotacao nao encontrada");

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "anotacoesPastorais", id);
  },
});
