import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ===== Helpers para o novo mural (Fase 1) =====

/** Retorna o scope efetivo do pedido, usando compartilhadoIgreja para legado. */
function resolveScope(pedido: any): "private" | "pg" | "leaders" | "church" {
  if (pedido.scope) return pedido.scope;
  return pedido.compartilhadoIgreja ? "church" : "private";
}

/** Retorna o timestamp de ultima atividade (fallback para criacao/atualizacao). */
function resolveLastActivity(pedido: any): number {
  return pedido.ultimaAtividadeEm ?? pedido.atualizadoEm ?? pedido.criadoEm ?? 0;
}

async function isLeaderMembro(ctx: any, membro: any): Promise<boolean> {
  if (membro.role === "admin") return true;
  const rolePerms = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("role", membro.role))
    .first();
  const perms = membro.permissions?.length > 0
    ? membro.permissions
    : (rolePerms?.permissions ?? []);
  return perms.includes("*") || perms.includes("pastoreio:update");
}

async function getPgIdsDoMembro(ctx: any, membroId: any): Promise<Set<string>> {
  const pgMembros = await ctx.db
    .query("pgMembros")
    .withIndex("by_membro", (q: any) => q.eq("membroId", membroId))
    .collect();
  const set = new Set<string>();
  for (const pm of pgMembros) set.add(pm.pgId);

  // Liderança também conta
  const allPgs = await ctx.db.query("pequenosGrupos").collect();
  for (const pg of allPgs) {
    if (pg.liderId === membroId || pg.coliderId === membroId) set.add(pg._id);
  }
  return set;
}

async function resolveMembroNome(ctx: any, membroId: any): Promise<string> {
  if (!membroId) return "";
  const membro = await ctx.db.get(membroId);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.nomeCompleto || "";
}

async function resolveMembroResumo(ctx: any, membroId: any) {
  if (!membroId) return null;
  const membro = await ctx.db.get(membroId);
  if (!membro) return null;
  const entidade = await ctx.db.get(membro.entidadeId);
  if (!entidade) return null;
  return {
    _id: membro._id,
    nome: entidade.nomeCompleto || "",
    foto: entidade.foto || null,
  };
}

async function enrichPedido(ctx: any, pedido: any, membroId: any) {
  const intercessores = await ctx.db
    .query("pedidoOracaoIntercessores")
    .withIndex("by_pedido", (q: any) => q.eq("pedidoId", pedido._id))
    .collect();

  const euOrando = intercessores.some((i: any) => i.membroId === membroId);

  const comentarios = await ctx.db
    .query("comentarios")
    .withIndex("by_entidade", (q: any) =>
      q.eq("entidadeTipo", "pedidos-oracao").eq("entidadeId", pedido._id)
    )
    .collect();

  const intercessoresResumo = await Promise.all(
    intercessores.slice(0, 5).map(async (i: any) => {
      const pessoa = await resolveMembroResumo(ctx, i.membroId);
      return {
        nome: pessoa?.nome || "",
        foto: pessoa?.foto || null,
      };
    })
  );

  return {
    ...pedido,
    membroNome: await resolveMembroNome(ctx, pedido.membroId),
    isOwner: pedido.membroId === membroId,
    qtdIntercessores: intercessores.length,
    euOrando,
    intercessoresResumo,
    qtdComentarios: comentarios.length,
  };
}

export const listPublicos = query({
  args: {
    filtro: v.optional(v.union(
      v.literal("MEUS"),
      v.literal("MEU_PG"),
      v.literal("TODOS"),
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const filtro = args.filtro ?? "TODOS";

    let pedidos: any[];

    if (filtro === "MEUS") {
      pedidos = await ctx.db
        .query("pedidosOracao")
        .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
        .order("desc")
        .collect();
    } else if (filtro === "MEU_PG") {
      // Encontrar PGs do membro
      const pgMembros = await ctx.db
        .query("pgMembros")
        .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
        .collect();
      const pgIds = pgMembros.map((pm) => pm.pgId);

      if (pgIds.length === 0) return [];

      // Encontrar todos membros dos mesmos PGs
      const pgMembroIds = new Set<string>();
      for (const pgId of pgIds) {
        const membros = await ctx.db
          .query("pgMembros")
          .withIndex("by_pg", (q) => q.eq("pgId", pgId))
          .collect();
        for (const m of membros) {
          pgMembroIds.add(m.membroId);
        }
      }
      // Incluir lideres/colideres dos PGs
      for (const pgId of pgIds) {
        const pg = await ctx.db.get(pgId);
        if (pg) {
          pgMembroIds.add(pg.liderId);
          if (pg.coliderId) pgMembroIds.add(pg.coliderId);
        }
      }

      const todosPedidos = await ctx.db
        .query("pedidosOracao")
        .order("desc")
        .collect();
      pedidos = todosPedidos.filter((p) => pgMembroIds.has(p.membroId));
    } else {
      pedidos = await ctx.db
        .query("pedidosOracao")
        .order("desc")
        .collect();
    }

    return Promise.all(
      pedidos.map((pedido) => enrichPedido(ctx, pedido, membro._id))
    );
  },
});

export const getById = query({
  args: { id: v.id("pedidosOracao") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    const pedido = await ctx.db.get(id);
    if (!pedido) return null;

    // Autor
    const autor = await resolveMembroResumo(ctx, pedido.membroId);

    // Comentarios (tabela unificada)
    const comentarios = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q) =>
        q.eq("entidadeTipo", "pedidos-oracao").eq("entidadeId", id)
      )
      .collect();
    const comentariosEnriched = await Promise.all(
      comentarios
        .sort((a, b) => a.criadoEm - b.criadoEm)
        .map(async (c) => {
          const autorComentario = await resolveMembroResumo(ctx, c.membroId);
          return {
            _id: c._id,
            texto: c.texto,
            tipo: c.tipo ?? "COMENTARIO",
            criadoEm: c.criadoEm,
            autorNome: autorComentario?.nome || "",
            autorFoto: autorComentario?.foto || null,
            isOwner: c.membroId === membro._id,
          };
        })
    );

    // Intercessores
    const intercessores = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido", (q) => q.eq("pedidoId", id))
      .collect();
    const intercessoresEnriched = await Promise.all(
      intercessores.map(async (i) => {
        const pessoa = await resolveMembroResumo(ctx, i.membroId);
        return {
          _id: i._id,
          nome: pessoa?.nome || "",
          foto: pessoa?.foto || null,
        };
      })
    );

    const euOrando = intercessores.some(
      (i) => i.membroId === membro._id
    );

    return {
      ...pedido,
      autor,
      isOwner: pedido.membroId === membro._id,
      comentarios: comentariosEnriched,
      intercessores: intercessoresEnriched,
      euOrando,
    };
  },
});

// ===== Novo mural (Fase 1) =====

/**
 * Mural da aba Orar: pedidos visiveis pelo usuario atual, respeitando scope.
 * Retorna tambem 3 primeiros avatares de quem orou, contagem total e euOrando.
 */
export const listMuralRequests = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const isLider = await isLeaderMembro(ctx, membro);
    const meusPgIds = await getPgIdsDoMembro(ctx, membro._id);

    // Lista todos os pedidos nao arquivados. Filtra visibilidade em memoria.
    const todos = await ctx.db.query("pedidosOracao").collect();

    const visiveis = todos.filter((p) => {
      if (p.status === "ARQUIVADO") return false;
      const scope = resolveScope(p);
      // Autor sempre ve seus proprios (mas "private" so aparece em Meus pedidos)
      if (scope === "private") return false;
      if (scope === "church") return true;
      if (scope === "leaders") return isLider || p.membroId === membro._id;
      if (scope === "pg") {
        if (p.membroId === membro._id) return true;
        if (!p.pgId) return false;
        return meusPgIds.has(p.pgId);
      }
      return false;
    });

    visiveis.sort((a, b) => resolveLastActivity(b) - resolveLastActivity(a));

    const slice = limit ? visiveis.slice(0, limit) : visiveis;

    return Promise.all(
      slice.map(async (pedido) => {
        const intercessores = await ctx.db
          .query("pedidoOracaoIntercessores")
          .withIndex("by_pedido", (q) => q.eq("pedidoId", pedido._id))
          .collect();

        const euOrando = intercessores.some((i) => i.membroId === membro._id);

        const primeiros = await Promise.all(
          intercessores.slice(0, 3).map(async (i) => {
            const pessoa = await resolveMembroResumo(ctx, i.membroId);
            return { nome: pessoa?.nome || "", foto: pessoa?.foto || null };
          }),
        );

        const autorResumo = pedido.anonimo
          ? null
          : await resolveMembroResumo(ctx, pedido.membroId);

        return {
          _id: pedido._id,
          descricao: pedido.descricao,
          status: pedido.status,
          scope: resolveScope(pedido),
          pgId: pedido.pgId ?? null,
          anonimo: !!pedido.anonimo,
          criadoEm: pedido.criadoEm,
          ultimaAtividadeEm: resolveLastActivity(pedido),
          isOwner: pedido.membroId === membro._id,
          autor: autorResumo,
          qtdOrando: intercessores.length,
          euOrando,
          primeirosOrantes: primeiros,
        };
      }),
    );
  },
});

/**
 * Pedidos criados pelo usuario atual, com filtro opcional de status.
 */
export const listMyRequests = query({
  args: {
    status: v.optional(v.union(
      v.literal("ATIVO"),
      v.literal("RESPONDIDO"),
      v.literal("ARQUIVADO"),
    )),
  },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    let pedidos = await ctx.db
      .query("pedidosOracao")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    if (status) pedidos = pedidos.filter((p) => p.status === status);

    pedidos.sort((a, b) => resolveLastActivity(b) - resolveLastActivity(a));

    return Promise.all(
      pedidos.map(async (pedido) => {
        const intercessores = await ctx.db
          .query("pedidoOracaoIntercessores")
          .withIndex("by_pedido", (q) => q.eq("pedidoId", pedido._id))
          .collect();

        return {
          _id: pedido._id,
          descricao: pedido.descricao,
          status: pedido.status,
          scope: resolveScope(pedido),
          pgId: pedido.pgId ?? null,
          anonimo: !!pedido.anonimo,
          criadoEm: pedido.criadoEm,
          ultimaAtividadeEm: resolveLastActivity(pedido),
          qtdOrando: intercessores.length,
        };
      }),
    );
  },
});

/**
 * Detalhe completo do pedido: autor, orantes, atualizacoes (legado em
 * comentarios com tipo=ATUALIZACAO + nova tabela pedidoOracaoAtualizacoes,
 * unificados e ordenados por criacao).
 */
export const getRequestDetail = query({
  args: { id: v.id("pedidosOracao") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    const pedido = await ctx.db.get(id);
    if (!pedido) return null;

    // Visibilidade: autor sempre ve; leaders ve tudo; pg/church seguem regras;
    // private so o autor.
    const scope = resolveScope(pedido);
    const isOwner = pedido.membroId === membro._id;
    if (!isOwner) {
      if (scope === "private") return null;
      if (scope === "leaders") {
        const lider = await isLeaderMembro(ctx, membro);
        if (!lider) return null;
      }
      if (scope === "pg") {
        if (!pedido.pgId) return null;
        const meusPgs = await getPgIdsDoMembro(ctx, membro._id);
        if (!meusPgs.has(pedido.pgId)) return null;
      }
    }

    const autor = pedido.anonimo
      ? null
      : await resolveMembroResumo(ctx, pedido.membroId);

    // Orantes
    const intercessores = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido", (q) => q.eq("pedidoId", id))
      .collect();
    const orantes = await Promise.all(
      intercessores.map(async (i) => {
        const pessoa = await resolveMembroResumo(ctx, i.membroId);
        return { _id: i._id, nome: pessoa?.nome || "", foto: pessoa?.foto || null };
      }),
    );
    const euOrando = intercessores.some((i) => i.membroId === membro._id);

    // Atualizacoes (novo)
    const atualNovas = await ctx.db
      .query("pedidoOracaoAtualizacoes")
      .withIndex("by_pedido", (q) => q.eq("pedidoId", id))
      .collect();

    // Atualizacoes legado (comentarios com tipo=ATUALIZACAO)
    const comentariosLegado = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q) =>
        q.eq("entidadeTipo", "pedidos-oracao").eq("entidadeId", id),
      )
      .collect();
    const atualLegado = comentariosLegado.filter((c) => c.tipo === "ATUALIZACAO");

    const atualizacoesUnion = [
      ...atualNovas.map((a) => ({
        _id: a._id,
        texto: a.texto,
        tipo: a.tipo as "ATUALIZACAO" | "REFORCO" | "TESTEMUNHO",
        autorId: a.autorId,
        criadoEm: a.criadoEm,
      })),
      ...atualLegado.map((c) => ({
        _id: c._id,
        texto: c.texto,
        tipo: "ATUALIZACAO" as const,
        autorId: c.membroId,
        criadoEm: c.criadoEm,
      })),
    ].sort((a, b) => a.criadoEm - b.criadoEm);

    const atualizacoes = await Promise.all(
      atualizacoesUnion.map(async (a) => {
        const autorAtual = await resolveMembroResumo(ctx, a.autorId);
        return {
          _id: a._id,
          texto: a.texto,
          tipo: a.tipo,
          criadoEm: a.criadoEm,
          autorNome: autorAtual?.nome || "",
          autorFoto: autorAtual?.foto || null,
        };
      }),
    );

    return {
      _id: pedido._id,
      descricao: pedido.descricao,
      status: pedido.status,
      scope,
      pgId: pedido.pgId ?? null,
      anonimo: !!pedido.anonimo,
      criadoEm: pedido.criadoEm,
      ultimaAtividadeEm: resolveLastActivity(pedido),
      autor,
      isOwner,
      orantes,
      qtdOrando: orantes.length,
      euOrando,
      atualizacoes,
    };
  },
});

/**
 * Conveniencia: boolean indicando se o usuario atual ja esta orando.
 */
export const hasUserPrayed = query({
  args: { pedidoId: v.id("pedidosOracao") },
  handler: async (ctx, { pedidoId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return false;

    const existing = await ctx.db
      .query("pedidoOracaoIntercessores")
      .withIndex("by_pedido_membro", (q) =>
        q.eq("pedidoId", pedidoId).eq("membroId", membro._id),
      )
      .first();
    return !!existing;
  },
});
