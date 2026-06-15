/**
 * Acesso de convidado (sem login): lista as gravacoes publicadas para quem
 * abre o link /convidado/<codigo>. Valida o codigo contra o token salvo em
 * configApp.convidadoToken — se nao bater (ou estiver vazio), nega.
 *
 * Retorna apenas campos necessarios para listar e tocar (sem transcricao/IA
 * interna), ja que e conteudo exposto publicamente.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

export const listConvidado = query({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const config = await ctx.db.query("configApp").first();
    const token = config?.convidadoToken;

    // Sem token configurado ou codigo nao confere → acesso negado
    if (!token || !codigo || codigo !== token) {
      return { valido: false as const, gravacoes: [] };
    }

    // Convidado ouve apenas as PREGACOES (sermoes) publicadas — nao estudos,
    // palestras, etc.
    // So sermoes publicados: filtra pelo indice by_tipo em vez de varrer tudo
    const publicadas = (
      await ctx.db
        .query("gravacoes")
        .withIndex("by_tipo", (q) => q.eq("tipo", "SERMAO"))
        .collect()
    )
      .filter((g) => g.status === "PUBLICADO")
      .sort((a, b) => b.data.localeCompare(a.data));

    const gravacoes = await Promise.all(
      publicadas.map(async (g) => {
        let pregadorNome = g.pregadorNome || "";
        if (!pregadorNome && g.pregadorId) {
          const membro = await ctx.db.get(g.pregadorId);
          if (membro) {
            const entidade = await ctx.db.get(membro.entidadeId);
            pregadorNome = entidade?.nomeCompleto || "";
          }
        }
        return {
          _id: g._id,
          titulo: g.titulo,
          tipo: g.tipo,
          data: g.data,
          pregadorNome,
          pregadorInfo: pregadorNome ? { nome: pregadorNome } : null,
          audioUrl: g.audioUrl ?? null,
          inicioConteudo: g.inicioConteudo,
          fimConteudo: g.fimConteudo,
          inicioSermao: g.inicioSermao,
          fimSermao: g.fimSermao,
        };
      })
    );

    return { valido: true as const, gravacoes };
  },
});
