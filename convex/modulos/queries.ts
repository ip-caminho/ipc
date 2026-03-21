import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listModulos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro || membro.role !== "admin") return [];

    const modulos = await ctx.db.query("modulos").collect();
    return modulos.sort((a, b) => a.ordem - b.ordem);
  },
});

export const listModulosAtivos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const modulos = await ctx.db.query("modulos").collect();
    return modulos
      .filter((m) => m.ativo)
      .map((m) => m.slug);
  },
});
