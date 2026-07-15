import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { INITIAL_ROLE_PERMISSIONS } from "../preferencias/rbacHelpers";

// Papeis validos = os definidos no codigo. A tabela rolePermissions pode conter
// papel legado orfao (ex: "comunicacao", removido do codigo em 07/2026) — esses
// nao podem ser concedidos por convite.
const PAPEIS_VALIDOS = new Set(Object.keys(INITIAL_ROLE_PERMISSIONS));

export const generateInvite = mutation({
  args: {
    role: v.optional(v.string()),
  },
  handler: async (ctx, { role }) => {
    // O convite define o papel do membro que sera criado em acceptInvite, entao
    // exige a mesma permissao de membros/mutations create — senao qualquer
    // usuario autenticado convidaria com papel privilegiado.
    const { membro: caller } = await requirePermission(ctx, "membros:create");

    const papel = role || "membro";

    if (!PAPEIS_VALIDOS.has(papel)) {
      throw new Error(`Papel invalido: ${papel}`);
    }

    // Conceder qualquer papel com poder (isto e, diferente de "membro") e
    // decisao de admin — nao basta ter membros:create. Guarda por poder e nao
    // pelo literal "admin": senao secretaria convidaria pastor/secretaria, ou um
    // papel que recebesse "*" em runtime passaria batido.
    if (papel !== "membro" && caller.role !== "admin") {
      throw new Error("Somente admin pode convidar com papel diferente de membro");
    }

    // Generate secure token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    await ctx.db.insert("membroConvites", {
      token,
      status: "PENDENTE",
      criadoPor: caller._id,
      expiraEm: Date.now() + twentyFourHoursMs,
      role: papel,
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
      papeis: [],
      vinculoIgreja: "MEMBRO",
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
