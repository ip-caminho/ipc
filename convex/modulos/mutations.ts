import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createActionAuditLog } from "../_shared/auditHelpers";
import { MODULOS_INICIAIS } from "./constants";

export const seedModulos = mutation({
  args: {},
  handler: async (ctx) => {
    for (const modulo of MODULOS_INICIAIS) {
      const existing = await ctx.db
        .query("modulos")
        .withIndex("by_slug", (q) => q.eq("slug", modulo.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("modulos", modulo);
      }
    }
  },
});

export const toggleModulo = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro || membro.role !== "admin") {
      throw new Error("Apenas admin pode alterar modulos");
    }

    const modulo = await ctx.db
      .query("modulos")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!modulo) throw new Error("Modulo nao encontrado");

    await ctx.db.patch(modulo._id, { ativo: !modulo.ativo });
    await createActionAuditLog(ctx, "TOGGLE", "modulos", modulo._id as string);
  },
});
