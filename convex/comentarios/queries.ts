import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

export const listByEntidade = query({
  args: {
    entidadeTipo: v.union(
      v.literal("tarefas"),
      v.literal("gravacoes"),
      v.literal("pedidos-oracao")
    ),
    entidadeId: v.string(),
  },
  handler: async (ctx, { entidadeTipo, entidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const comentarios = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q) =>
        q.eq("entidadeTipo", entidadeTipo).eq("entidadeId", entidadeId)
      )
      .collect();

    return Promise.all(
      comentarios.map(async (c) => {
        const autor = await resolveMembroResumo(ctx, c.membroId);
        return {
          ...c,
          autorNome: autor?.nome || "Usuario",
          autorFoto: autor?.foto || null,
          isOwner: c.membroId === membro._id,
        };
      })
    );
  },
});

export const countByEntidade = query({
  args: {
    entidadeTipo: v.union(
      v.literal("tarefas"),
      v.literal("gravacoes"),
      v.literal("pedidos-oracao")
    ),
    entidadeId: v.string(),
  },
  handler: async (ctx, { entidadeTipo, entidadeId }) => {
    const comentarios = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q) =>
        q.eq("entidadeTipo", entidadeTipo).eq("entidadeId", entidadeId)
      )
      .collect();
    return comentarios.length;
  },
});
