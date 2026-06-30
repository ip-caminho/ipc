import { query } from "../_generated/server";
import { requirePermission } from "../_shared/requirePermission";
import type { Doc } from "../_generated/dataModel";

// Gravacao cujo iaAvisos alimenta "Esta semana" no site (mesma varredura de
// public/avisos.ts:listUltimoCulto, mas admin: retorna iaAvisos COMPLETO,
// incluindo contato/dataEvento, para a curadoria poder preserva-los).
// Exige site_publico:manage.
export const getGravacaoDoSite = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "site_publico:manage");
    let culto: Doc<"gravacoes"> | null = null;
    let scanned = 0;
    for await (const g of ctx.db
      .query("gravacoes")
      .withIndex("by_data")
      .order("desc")) {
      if (++scanned > 40) break;
      if (
        g.status === "PUBLICADO" &&
        g.tipo === "SERMAO" &&
        Array.isArray(g.iaAvisos) &&
        g.iaAvisos.length > 0
      ) {
        culto = g;
        break;
      }
    }
    if (!culto) return null;
    return {
      gravacaoId: culto._id,
      data: culto.data,
      titulo: culto.titulo,
      avisos: culto.iaAvisos ?? [],
    };
  },
});
