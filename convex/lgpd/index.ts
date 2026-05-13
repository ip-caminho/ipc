import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const VERSAO_TEXTO_ATUAL = "1.0";

const FINALIDADE_VALIDATOR = v.union(
  v.literal("CADASTRO_BASICO"),
  v.literal("MENSAGERIA"),
  v.literal("FOTO_PUBLICACAO"),
  v.literal("COMPARTILHAMENTO_IPB"),
);

export const meusConsentimentos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];
    return await ctx.db
      .query("consentimentosLgpd")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();
  },
});

export const aceitar = mutation({
  args: { finalidade: FINALIDADE_VALIDATOR },
  handler: async (ctx, { finalidade }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) throw new Error("Membro nao encontrado");

    // Idempotente: se ja existe aceite ativo para essa finalidade na versao atual, nao duplica
    const existentes = await ctx.db
      .query("consentimentosLgpd")
      .withIndex("by_membro_finalidade", (q) =>
        q.eq("membroId", membro._id).eq("finalidade", finalidade)
      )
      .collect();
    const ativo = existentes.find(
      (c) => c.versaoTexto === VERSAO_TEXTO_ATUAL && !c.revogadoEm
    );
    if (ativo) return ativo._id;

    return await ctx.db.insert("consentimentosLgpd", {
      membroId: membro._id,
      finalidade,
      aceitoEm: Date.now(),
      versaoTexto: VERSAO_TEXTO_ATUAL,
    });
  },
});

export const revogar = mutation({
  args: { id: v.id("consentimentosLgpd") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const c = await ctx.db.get(id);
    if (!c) throw new Error("Consentimento nao encontrado");
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro._id !== c.membroId) {
      throw new Error("Apenas o proprio membro pode revogar consentimento");
    }
    await ctx.db.patch(id, { revogadoEm: Date.now() });
    return { ok: true };
  },
});
