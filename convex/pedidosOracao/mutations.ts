import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");

  return { userId, membro };
}

export const create = mutation({
  args: {
    descricao: v.string(),
    compartilhadoIgreja: v.optional(v.boolean()),
  },
  handler: async (ctx, { descricao, compartilhadoIgreja }) => {
    const { membro } = await requireAuth(ctx);

    const id = await ctx.db.insert("pedidosOracao", {
      membroId: membro._id,
      descricao,
      status: "ATIVO",
      compartilhadoIgreja: compartilhadoIgreja ?? false,
      criadoEm: Date.now(),
    });

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("pedidosOracao"),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("RESPONDIDO"),
      v.literal("ARQUIVADO"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const { membro } = await requireAuth(ctx);

    const pedido = await ctx.db.get(id);
    if (!pedido) throw new Error("Pedido nao encontrado");

    // Apenas o dono ou lideranca pode mudar status
    if (pedido.membroId !== membro._id && membro.role !== "admin") {
      // Check pastoreio:update permission
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q: any) => q.eq("role", membro.role))
        .first();
      const perms = membro.permissions?.length > 0
        ? membro.permissions
        : (rolePerms?.permissions ?? []);
      if (!perms.includes("*") && !perms.includes("pastoreio:update")) {
        throw new Error("Sem permissao");
      }
    }

    await ctx.db.patch(id, { status, atualizadoEm: Date.now() });
  },
});

export const addComentario = mutation({
  args: {
    pedidoId: v.id("pedidosOracao"),
    texto: v.string(),
    tipo: v.optional(v.union(v.literal("COMENTARIO"), v.literal("ATUALIZACAO"))),
  },
  handler: async (ctx, { pedidoId, texto, tipo }) => {
    const { membro } = await requireAuth(ctx);

    const pedido = await ctx.db.get(pedidoId);
    if (!pedido) throw new Error("Pedido nao encontrado");

    // Apenas o dono do pedido pode postar atualizacoes
    if (tipo === "ATUALIZACAO" && pedido.membroId !== membro._id) {
      throw new Error("Apenas o autor pode postar atualizacoes");
    }

    const id = await ctx.db.insert("pedidoOracaoComentarios", {
      pedidoId,
      membroId: membro._id,
      texto,
      tipo: tipo ?? "COMENTARIO",
      criadoEm: Date.now(),
    });

    // Atualiza timestamp do pedido
    await ctx.db.patch(pedidoId, { atualizadoEm: Date.now() });

    return id;
  },
});

export const removeComentario = mutation({
  args: { id: v.id("pedidoOracaoComentarios") },
  handler: async (ctx, { id }) => {
    const { membro } = await requireAuth(ctx);

    const comentario = await ctx.db.get(id);
    if (!comentario) throw new Error("Comentario nao encontrado");

    // Apenas o autor do comentario pode excluir
    if (comentario.membroId !== membro._id && membro.role !== "admin") {
      throw new Error("Sem permissao");
    }

    await ctx.db.delete(id);
  },
});

export const toggleOrando = mutation({
  args: {
    pedidoId: v.id("pedidosOracao"),
  },
  handler: async (ctx, { pedidoId }) => {
    const { membro } = await requireAuth(ctx);

    const pedido = await ctx.db.get(pedidoId);
    if (!pedido) throw new Error("Pedido nao encontrado");

    // Verificar se ja esta orando
    const existing = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido_membro", (q) =>
        q.eq("pedidoId", pedidoId).eq("membroId", membro._id)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { orando: false };
    } else {
      await ctx.db.insert("pedidoOracaoIntercessores", {
        pedidoId,
        membroId: membro._id,
        criadoEm: Date.now(),
      });
      return { orando: true };
    }
  },
});
