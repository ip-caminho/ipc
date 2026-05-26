import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      contatoEmergencia: entidade.contatoEmergencia || null,
      profissao: entidade.profissao || "",
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    foto: v.optional(v.string()),
    apelido: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    profissao: v.optional(v.string()),
    endereco: v.optional(
      v.object({
        logradouro: v.string(),
        numero: v.string(),
        complemento: v.optional(v.string()),
        bairro: v.string(),
        cidade: v.string(),
        estado: v.string(),
        cep: v.string(),
      })
    ),
    contatoEmergencia: v.optional(
      v.object({
        nome: v.string(),
        telefone: v.string(),
        parentesco: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Nao autenticado");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Membro nao encontrado");

    const updates: Record<string, unknown> = {};
    if (args.foto !== undefined) updates.foto = args.foto;
    if (args.apelido !== undefined) updates.apelido = args.apelido;
    if (args.email !== undefined) updates.email = args.email;
    if (args.whatsapp !== undefined) updates.whatsapp = args.whatsapp;
    if (args.profissao !== undefined) updates.profissao = args.profissao;
    if (args.endereco !== undefined) updates.endereco = args.endereco;
    if (args.contatoEmergencia !== undefined) updates.contatoEmergencia = args.contatoEmergencia;

    updates.perfilAtualizadoEm = Date.now();
    updates.perfilAtualizadoPor = membro._id;

    await ctx.db.patch(membro.entidadeId, updates);
    await ctx.db.patch(membro._id, { onboardingCompleto: true });

    return { ok: true };
  },
});
