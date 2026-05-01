import { query } from "../_generated/server";

/**
 * Retorna a configuracao global do app (singleton).
 * Se nao existir ainda, retorna o default (modoQuiosque=false).
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("configApp").first();
    return config ?? { modoQuiosque: false, atualizadoEm: 0 };
  },
});
