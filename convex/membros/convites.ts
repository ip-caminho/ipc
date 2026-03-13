import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateInvite = mutation({
  args: {
    role: v.optional(v.string()),
  },
  handler: async (ctx, { role }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate secure token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    await ctx.db.insert("membroConvites", {
      token,
      status: "PENDENTE",
      criadoPor: callerMembro?._id,
      expiraEm: Date.now() + twentyFourHoursMs,
      role: role || "membro",
    });

    return token;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const convite = await ctx.db
      .query("membroConvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!convite) return null;
    if (convite.status !== "PENDENTE") return { ...convite, expired: true };
    if (convite.expiraEm < Date.now()) return { ...convite, expired: true };

    return { ...convite, expired: false };
  },
});

export const acceptInvite = mutation({
  args: {
    token: v.string(),
    nomeCompleto: v.string(),
    whatsapp: v.string(),
    cpf: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const convite = await ctx.db
      .query("membroConvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!convite || convite.status !== "PENDENTE" || convite.expiraEm < Date.now()) {
      throw new Error("Invalid or expired invite");
    }

    // Create entidade + membro atomically
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: args.nomeCompleto,
      whatsapp: args.whatsapp,
      cpf: args.cpf,
      dataNascimento: args.dataNascimento,
      sexo: args.sexo as any,
      email: args.email,
    });

    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: convite.role || "membro",
    });

    // Mark invite as accepted
    await ctx.db.patch(convite._id, {
      status: "ACEITO",
      dadosPreenchidos: {
        nomeCompleto: args.nomeCompleto,
        whatsapp: args.whatsapp,
        membroId,
      },
    });

    return { membroId, entidadeId };
  },
});
