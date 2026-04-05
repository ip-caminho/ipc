import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Dados para a tela de boas-vindas */
export const getOnboardingData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade) return null;

    return {
      membroId: membro._id,
      entidadeId: entidade._id,
      nomeCompleto: entidade.nomeCompleto || "",
      apelido: entidade.apelido || "",
      foto: entidade.foto || null,
      whatsapp: entidade.whatsapp || "",
      email: entidade.email || "",
      dataNascimento: entidade.dataNascimento || "",
      sexo: entidade.sexo || "",
      endereco: entidade.endereco || null,
      profissao: entidade.profissao || "",
    };
  },
});

/** Confirmar dados e marcar onboarding como completo */
export const completeOnboarding = mutation({
  args: {
    foto: v.optional(v.string()),
    apelido: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    profissao: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Nao autenticado");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Membro nao encontrado");

    // Atualizar dados opcionais na entidade
    const updates: Record<string, string | undefined> = {};
    if (args.foto !== undefined) updates.foto = args.foto;
    if (args.apelido !== undefined) updates.apelido = args.apelido;
    if (args.email !== undefined) updates.email = args.email;
    if (args.whatsapp !== undefined) updates.whatsapp = args.whatsapp;
    if (args.profissao !== undefined) updates.profissao = args.profissao;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(membro.entidadeId, updates);
    }

    // Marcar onboarding como completo
    await ctx.db.patch(membro._id, { onboardingCompleto: true });

    return { ok: true };
  },
});
