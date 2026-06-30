import { query } from "../_generated/server";
import { v } from "convex/values";
import { getSaoPauloDateString } from "../_shared/datetime";

// Avisos — endpoint PÚBLICO (sem auth). Usado no bloco "Esta semana" da home.

export type AvisoPublico = {
  _id: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
};

// Avisos vigentes hoje (dataInicio <= hoje <= dataFim), mais recentes primeiro.
// Tabela pequena; segue o padrão de leitura já usado em avisos/queries.ts.
export const listVigentes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 4 }): Promise<AvisoPublico[]> => {
    const hoje = getSaoPauloDateString();
    const avisos = await ctx.db.query("avisos").collect();
    return avisos
      .filter((a) => {
        const fim = a.dataFim || a.dataInicio;
        return a.dataInicio <= hoje && fim >= hoje;
      })
      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))
      .slice(0, Math.max(0, limit))
      .map((a) => ({
        _id: a._id,
        titulo: a.titulo,
        descricao: a.descricao,
        dataInicio: a.dataInicio,
      }));
  },
});
