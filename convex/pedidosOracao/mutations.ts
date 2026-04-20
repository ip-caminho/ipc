import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

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

    const now = Date.now();
    const id = await ctx.db.insert("pedidosOracao", {
      membroId: membro._id,
      descricao,
      status: "ATIVO",
      compartilhadoIgreja: compartilhadoIgreja ?? false,
      // Campos novos — escala o legado para o novo modelo
      scope: compartilhadoIgreja ? "church" : "private",
      anonimo: false,
      qtdOrando: 0,
      ultimaAtividadeEm: now,
      criadoEm: now,
    });

    await createActionAuditLog(ctx, "CREATE", "pedidosOracao", id as string);
    return id;
  },
});

/**
 * Criacao nova (Fase 1) — scope granular + anonimato + pg opcional.
 */
export const createPrayerRequest = mutation({
  args: {
    texto: v.string(),
    scope: v.union(
      v.literal("private"),
      v.literal("pg"),
      v.literal("leaders"),
      v.literal("church"),
    ),
    pgId: v.optional(v.id("pequenosGrupos")),
    anonimo: v.optional(v.boolean()),
  },
  handler: async (ctx, { texto, scope, pgId, anonimo }) => {
    const { membro } = await requireAuth(ctx);

    if (texto.trim().length < 10) {
      throw new Error("Pedido precisa ter ao menos 10 caracteres");
    }
    if (scope === "pg" && !pgId) {
      throw new Error("scope=pg requer pgId");
    }

    const now = Date.now();
    const id = await ctx.db.insert("pedidosOracao", {
      membroId: membro._id,
      descricao: texto.trim(),
      status: "ATIVO",
      compartilhadoIgreja: scope !== "private",
      scope,
      pgId,
      anonimo: !!anonimo,
      qtdOrando: 0,
      ultimaAtividadeEm: now,
      criadoEm: now,
    });

    await createActionAuditLog(ctx, "CREATE", "pedidosOracao", id as string);
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

    const old = { ...pedido };
    await ctx.db.patch(id, { status, atualizadoEm: Date.now() });
    const updated = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, old, updated, "pedidosOracao");
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

    const id = await ctx.db.insert("comentarios", {
      entidadeTipo: "pedidos-oracao",
      entidadeId: pedidoId,
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
  args: { id: v.id("comentarios") },
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

    const existing = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido_membro", (q) =>
        q.eq("pedidoId", pedidoId).eq("membroId", membro._id)
      )
      .first();

    const now = Date.now();
    let orando: boolean;
    if (existing) {
      await ctx.db.delete(existing._id);
      orando = false;
    } else {
      await ctx.db.insert("pedidoOracaoIntercessores", {
        pedidoId,
        membroId: membro._id,
        criadoEm: now,
      });
      orando = true;
    }

    // Mantem contagem denormalizada + timestamp de atividade
    const total = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido", (q) => q.eq("pedidoId", pedidoId))
      .collect();
    await ctx.db.patch(pedidoId, {
      qtdOrando: total.length,
      ultimaAtividadeEm: now,
    });

    return { orando };
  },
});

/**
 * Alias para `toggleOrando` alinhado a nomenclatura nova do spec.
 */
export const togglePrayer = mutation({
  args: { pedidoId: v.id("pedidosOracao") },
  handler: async (ctx, { pedidoId }) => {
    const { membro } = await requireAuth(ctx);

    const pedido = await ctx.db.get(pedidoId);
    if (!pedido) throw new Error("Pedido nao encontrado");

    const existing = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido_membro", (q) =>
        q.eq("pedidoId", pedidoId).eq("membroId", membro._id),
      )
      .first();

    const now = Date.now();
    let orando: boolean;
    if (existing) {
      await ctx.db.delete(existing._id);
      orando = false;
    } else {
      await ctx.db.insert("pedidoOracaoIntercessores", {
        pedidoId,
        membroId: membro._id,
        criadoEm: now,
      });
      orando = true;
    }

    const total = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido", (q) => q.eq("pedidoId", pedidoId))
      .collect();
    await ctx.db.patch(pedidoId, {
      qtdOrando: total.length,
      ultimaAtividadeEm: now,
    });

    return { orando };
  },
});

/**
 * Autor adiciona uma atualizacao ao proprio pedido.
 * Se tipo === TESTEMUNHO, o pedido vai automaticamente para status RESPONDIDO.
 * Bump de `ultimaAtividadeEm` para subir no mural.
 */
export const addUpdate = mutation({
  args: {
    pedidoId: v.id("pedidosOracao"),
    texto: v.string(),
    tipo: v.union(
      v.literal("ATUALIZACAO"),
      v.literal("REFORCO"),
      v.literal("TESTEMUNHO"),
    ),
  },
  handler: async (ctx, { pedidoId, texto, tipo }) => {
    const { membro } = await requireAuth(ctx);

    const pedido = await ctx.db.get(pedidoId);
    if (!pedido) throw new Error("Pedido nao encontrado");

    if (pedido.membroId !== membro._id) {
      throw new Error("Apenas o autor pode postar atualizacoes");
    }
    if (texto.trim().length < 10) {
      throw new Error("Atualizacao precisa ter ao menos 10 caracteres");
    }

    const now = Date.now();
    const id = await ctx.db.insert("pedidoOracaoAtualizacoes", {
      pedidoId,
      autorId: membro._id,
      texto: texto.trim(),
      tipo,
      criadoEm: now,
    });

    const patch: Record<string, unknown> = {
      ultimaAtividadeEm: now,
      atualizadoEm: now,
    };
    if (tipo === "TESTEMUNHO") {
      patch.status = "RESPONDIDO";
    } else if (tipo === "ATUALIZACAO" || tipo === "REFORCO") {
      // Se o pedido estava respondido mas continua precisando de oracao,
      // volta para ativo
      patch.status = "ATIVO";
    }
    await ctx.db.patch(pedidoId, patch);

    // Divida tecnica: notificar orantes (exceto o autor) quando houver
    // infra de push/email. Por ora, a timeline reativa do Convex cobre.

    return id;
  },
});

/**
 * Arquiva o pedido — remove do mural mas mantem em Meus pedidos.
 * Equivalente a updateStatus({ status: ARQUIVADO }) mas limita ao autor.
 */
export const archiveRequest = mutation({
  args: { pedidoId: v.id("pedidosOracao") },
  handler: async (ctx, { pedidoId }) => {
    const { membro } = await requireAuth(ctx);

    const pedido = await ctx.db.get(pedidoId);
    if (!pedido) throw new Error("Pedido nao encontrado");
    if (pedido.membroId !== membro._id) {
      throw new Error("Apenas o autor pode arquivar");
    }

    const now = Date.now();
    await ctx.db.patch(pedidoId, {
      status: "ARQUIVADO",
      atualizadoEm: now,
      ultimaAtividadeEm: now,
    });
  },
});
