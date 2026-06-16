import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Ajusta o contador denormalizado de comentarios da tarefa (so entidadeTipo
// "tarefas" tem contador; gravacoes usa gravacoes/comentarios.ts).
async function bumpTarefaComentarios(ctx: any, entidadeTipo: string, entidadeId: string, delta: number) {
  if (entidadeTipo !== "tarefas") return;
  const tarefa = await ctx.db.get(entidadeId as Id<"tarefas">);
  if (!tarefa) return;
  await ctx.db.patch(tarefa._id, {
    qtdComentarios: Math.max(0, (tarefa.qtdComentarios ?? 0) + delta),
  });
}

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Nao autenticado");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");

  return { userId, membro };
}

export const create = mutation({
  args: {
    entidadeTipo: v.union(
      v.literal("tarefas"),
      v.literal("gravacoes"),
      v.literal("pedidos-oracao")
    ),
    entidadeId: v.string(),
    texto: v.string(),
    parentId: v.optional(v.id("comentarios")),
    tipo: v.optional(v.union(v.literal("COMENTARIO"), v.literal("ATUALIZACAO"))),
  },
  handler: async (ctx, { entidadeTipo, entidadeId, texto, parentId, tipo }) => {
    const { membro } = await requireAuth(ctx);

    const id = await ctx.db.insert("comentarios", {
      entidadeTipo,
      entidadeId,
      membroId: membro._id,
      texto: texto.trim(),
      parentId,
      tipo: tipo ?? "COMENTARIO",
      criadoEm: Date.now(),
    });
    await bumpTarefaComentarios(ctx, entidadeTipo, entidadeId, 1);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("comentarios") },
  handler: async (ctx, { id }) => {
    const { membro } = await requireAuth(ctx);

    const comentario = await ctx.db.get(id);
    if (!comentario) throw new Error("Comentario nao encontrado");

    // Apenas o autor ou admin pode excluir
    if (comentario.membroId !== membro._id && membro.role !== "admin") {
      throw new Error("Sem permissao para excluir este comentario");
    }

    // Remove respostas (replies)
    const replies = await ctx.db
      .query("comentarios")
      .withIndex("by_parent", (q) => q.eq("parentId", id))
      .collect();
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(id);
    await bumpTarefaComentarios(
      ctx,
      comentario.entidadeTipo,
      comentario.entidadeId,
      -(1 + replies.length),
    );
  },
});
