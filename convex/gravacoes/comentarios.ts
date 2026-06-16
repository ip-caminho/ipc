import { query, mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getMembroId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Nao autenticado");
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");
  return membro._id;
}

// ===== COMENTARIOS (usa tabela unificada 'comentarios') =====

export const listByGravacao = query({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    const comentarios = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q) =>
        q.eq("entidadeTipo", "gravacoes").eq("entidadeId", gravacaoId)
      )
      .collect();

    return Promise.all(
      comentarios.map(async (c) => {
        const membro = await ctx.db.get(c.membroId);
        let autorNome = "Usuario";
        if (membro) {
          const entidade = await ctx.db.get(membro.entidadeId);
          autorNome = entidade?.nomeCompleto || entidade?.nomeRazaoSocial || "Usuario";
        }
        return {
          ...c,
          autorNome,
          // Manter compatibilidade com o frontend existente
          createdAt: c.criadoEm,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    gravacaoId: v.id("gravacoes"),
    texto: v.string(),
    parentId: v.optional(v.id("comentarios")),
  },
  handler: async (ctx, { gravacaoId, texto, parentId }) => {
    const membroId = await getMembroId(ctx);
    const id = await ctx.db.insert("comentarios", {
      entidadeTipo: "gravacoes",
      entidadeId: gravacaoId,
      membroId,
      texto: texto.trim(),
      parentId,
      tipo: "COMENTARIO",
      criadoEm: Date.now(),
    });
    // Contador denormalizado (+1)
    const gravacao = await ctx.db.get(gravacaoId);
    if (gravacao) {
      await ctx.db.patch(gravacaoId, {
        comentariosCount: (gravacao.comentariosCount ?? 0) + 1,
      });
    }
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("comentarios") },
  handler: async (ctx, { id }) => {
    const membroId = await getMembroId(ctx);
    const comentario = await ctx.db.get(id);
    if (!comentario) throw new Error("Comentario nao encontrado");

    if (comentario.membroId !== membroId) {
      const userId = await getAuthUserId(ctx);
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
        .first();
      if (!membro || membro.role !== "admin") {
        throw new Error("Sem permissao para excluir este comentario");
      }
    }

    // Remove replies
    const replies = await ctx.db
      .query("comentarios")
      .withIndex("by_parent", (q) => q.eq("parentId", id))
      .collect();
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(id);

    // Contador denormalizado: decrementa pelo comentario + suas replies
    if (comentario.entidadeTipo === "gravacoes") {
      const gravacaoId = comentario.entidadeId as Id<"gravacoes">;
      const gravacao = await ctx.db.get(gravacaoId);
      if (gravacao) {
        await ctx.db.patch(gravacaoId, {
          comentariosCount: Math.max(
            0,
            (gravacao.comentariosCount ?? 0) - (1 + replies.length),
          ),
        });
      }
    }
  },
});

// ===== REACOES (mantidas na tabela original) =====

export const listReacoes = query({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    const userId = await getAuthUserId(ctx);
    let myMembroId = null;
    if (userId) {
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      myMembroId = membro?._id ?? null;
    }

    const reacoes = await ctx.db
      .query("reacoesGravacao")
      .withIndex("by_gravacao", (q) => q.eq("gravacaoId", gravacaoId))
      .collect();

    const map: Record<string, { count: number; mine: boolean }> = {};
    for (const r of reacoes) {
      if (!map[r.tipo]) map[r.tipo] = { count: 0, mine: false };
      map[r.tipo].count++;
      if (myMembroId && r.membroId === myMembroId) map[r.tipo].mine = true;
    }
    return Object.entries(map).map(([tipo, data]) => ({ tipo, ...data }));
  },
});

export const toggleReacao = mutation({
  args: {
    gravacaoId: v.id("gravacoes"),
    tipo: v.string(),
  },
  handler: async (ctx, { gravacaoId, tipo }) => {
    const membroId = await getMembroId(ctx);

    const existing = await ctx.db
      .query("reacoesGravacao")
      .withIndex("by_gravacao_membro", (q) =>
        q.eq("gravacaoId", gravacaoId).eq("membroId", membroId)
      )
      .collect();

    const myReaction = existing.find((r) => r.tipo === tipo);
    const gravacao = await ctx.db.get(gravacaoId);
    const resumo = [...(gravacao?.reacoesResumo ?? [])];
    const idx = resumo.findIndex((r) => r.tipo === tipo);

    if (myReaction) {
      await ctx.db.delete(myReaction._id);
      if (idx >= 0) {
        const novo = resumo[idx].count - 1;
        if (novo > 0) resumo[idx] = { tipo, count: novo };
        else resumo.splice(idx, 1);
      }
      if (gravacao) await ctx.db.patch(gravacaoId, { reacoesResumo: resumo });
      return { action: "removed" };
    }

    await ctx.db.insert("reacoesGravacao", {
      gravacaoId,
      membroId,
      tipo,
      createdAt: Date.now(),
    });
    if (idx >= 0) resumo[idx] = { tipo, count: resumo[idx].count + 1 };
    else resumo.push({ tipo, count: 1 });
    if (gravacao) await ctx.db.patch(gravacaoId, { reacoesResumo: resumo });
    return { action: "added" };
  },
});
