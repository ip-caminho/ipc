import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    .query("pedidoOracaoComentarios")
    .withIndex("by_pedido", (q: any) => q.eq("pedidoId", pedido._id))
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

    // Comentarios
    const comentarios = await ctx.db
      .query("pedidoOracaoComentarios")
      .withIndex("by_pedido", (q) => q.eq("pedidoId", id))
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
