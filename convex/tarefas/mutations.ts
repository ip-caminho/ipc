import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasPermission, resolvePermissions, INITIAL_ROLE_PERMISSIONS } from "../preferencias/rbacHelpers";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Nao autenticado");

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

  return { userId, membro, permissions };
}

export const create = mutation({
  args: {
    titulo: v.string(),
    descricao: v.optional(v.string()),
    prioridade: v.union(
      v.literal("BAIXA"),
      v.literal("MEDIA"),
      v.literal("ALTA"),
      v.literal("URGENTE")
    ),
    responsavelId: v.id("membros"),
    dataVencimento: v.optional(v.string()),
    moduloRelacionado: v.optional(v.union(
      v.literal("ministerios"),
      v.literal("escalas"),
      v.literal("calendario"),
      v.literal("pequenos-grupos"),
      v.literal("pastoreio"),
      v.literal("gravacoes"),
      v.literal("pedidos-oracao")
    )),
    referenciaId: v.optional(v.string()),
    referenciaTitulo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { membro, permissions } = await requireAuth(ctx);

    if (!hasPermission(permissions, "tarefas:create")) {
      throw new Error("Sem permissao para criar tarefas");
    }

    const id = await ctx.db.insert("tarefas", {
      titulo: args.titulo.trim(),
      descricao: args.descricao?.trim(),
      status: "ABERTA",
      prioridade: args.prioridade,
      criadoPor: membro._id,
      responsavelId: args.responsavelId,
      dataVencimento: args.dataVencimento,
      moduloRelacionado: args.moduloRelacionado,
      referenciaId: args.referenciaId,
      referenciaTitulo: args.referenciaTitulo,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "tarefas", id as string);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("tarefas"),
    titulo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    prioridade: v.optional(v.union(
      v.literal("BAIXA"),
      v.literal("MEDIA"),
      v.literal("ALTA"),
      v.literal("URGENTE")
    )),
    responsavelId: v.optional(v.id("membros")),
    dataVencimento: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const { membro, permissions } = await requireAuth(ctx);

    const tarefa = await ctx.db.get(id);
    if (!tarefa) throw new Error("Tarefa nao encontrada");

    // Owner ou permissao tarefas:update
    const isOwner = tarefa.criadoPor === membro._id;
    if (!isOwner && !hasPermission(permissions, "tarefas:update")) {
      throw new Error("Sem permissao para editar esta tarefa");
    }

    const oldRecord = await ctx.db.get(id);

    const patch: any = { atualizadoEm: Date.now() };
    if (updates.titulo !== undefined) patch.titulo = updates.titulo.trim();
    if (updates.descricao !== undefined) patch.descricao = updates.descricao.trim();
    if (updates.prioridade !== undefined) patch.prioridade = updates.prioridade;
    if (updates.responsavelId !== undefined) patch.responsavelId = updates.responsavelId;
    if (updates.dataVencimento !== undefined) patch.dataVencimento = updates.dataVencimento;

    await ctx.db.patch(id, patch);
    const newRecord = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "tarefas");
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tarefas"),
    status: v.union(
      v.literal("ABERTA"),
      v.literal("EM_ANDAMENTO"),
      v.literal("CONCLUIDA"),
      v.literal("CANCELADA")
    ),
  },
  handler: async (ctx, { id, status }) => {
    const { membro, permissions } = await requireAuth(ctx);

    const tarefa = await ctx.db.get(id);
    if (!tarefa) throw new Error("Tarefa nao encontrada");

    // Owner, responsavel, ou permissao
    const isOwner = tarefa.criadoPor === membro._id;
    const isResponsavel = tarefa.responsavelId === membro._id;
    if (!isOwner && !isResponsavel && !hasPermission(permissions, "tarefas:update")) {
      throw new Error("Sem permissao para alterar status");
    }

    const oldRecord = await ctx.db.get(id);

    const patch: any = { status, atualizadoEm: Date.now() };
    if (status === "CONCLUIDA") {
      patch.concluidaEm = Date.now();
      patch.concluidaPor = membro._id;
    }

    await ctx.db.patch(id, patch);
    const newRecord = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "tarefas");
  },
});

export const remove = mutation({
  args: { id: v.id("tarefas") },
  handler: async (ctx, { id }) => {
    const { membro, permissions } = await requireAuth(ctx);

    const tarefa = await ctx.db.get(id);
    if (!tarefa) throw new Error("Tarefa nao encontrada");

    // Owner ou permissao tarefas:delete
    const isOwner = tarefa.criadoPor === membro._id;
    if (!isOwner && !hasPermission(permissions, "tarefas:delete")) {
      throw new Error("Sem permissao para excluir esta tarefa");
    }

    await createActionAuditLog(ctx, "DELETE", "tarefas", id as string);

    // Remover comentarios associados
    const comentarios = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q) =>
        q.eq("entidadeTipo", "tarefas").eq("entidadeId", id)
      )
      .collect();
    for (const c of comentarios) {
      await ctx.db.delete(c._id);
    }

    await ctx.db.delete(id);
  },
});
