import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Retorna a configuracao global do app (singleton).
 * Se nao existir ainda, retorna o default (modoQuiosque=false).
 *
 * Query publica — NAO expoe `convidadoToken` (e credencial de acesso).
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("configApp").first();
    return {
      modoQuiosque: config?.modoQuiosque ?? false,
      atualizadoEm: config?.atualizadoEm ?? 0,
    };
  },
});

/**
 * Link de convidado atual (admin). Retorna o codigo cru para montar a URL.
 * So admin pode ver o token.
 */
export const getConvidadoToken = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") return null;

    const config = await ctx.db.query("configApp").first();
    return { token: config?.convidadoToken ?? null };
  },
});
