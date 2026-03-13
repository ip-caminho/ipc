import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Bootstrap: creates the first admin member linked to the currently logged-in user.
 * Only works if no membros exist yet (first-time setup).
 */
export const bootstrapAdmin = mutation({
  args: {
    nomeCompleto: v.string(),
    whatsapp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Only works if no membros exist (first-time setup)
    const existingMembros = await ctx.db.query("membros").first();
    if (existingMembros) {
      throw new Error("Bootstrap already done — membros already exist");
    }

    // Create entidade + membro atomically
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: args.nomeCompleto,
      whatsapp: args.whatsapp,
    });

    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      userId,
      role: "admin",
    });

    // Seed role permissions
    const roles = {
      admin: ["*"],
      secretaria: [
        "membros:read", "membros:create", "membros:update",
        "entidades:read", "entidades:create", "entidades:update", "entidades:delete",
        "diretorio:read",
        "gravacoes:read", "gravacoes:create", "gravacoes:update", "gravacoes:delete",
        "audit:read",
      ],
      membro: [
        "membros:self_service",
        "diretorio:read",
        "gravacoes:read",
      ],
    };

    for (const [role, permissions] of Object.entries(roles)) {
      const existing = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      if (!existing) {
        await ctx.db.insert("rolePermissions", { role, permissions, updatedAt: Date.now() });
      }
    }

    return { membroId, entidadeId };
  },
});
