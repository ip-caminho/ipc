import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { urlsDoDocumento } from "./orfaos";

// Leitura da varredura de orfaos. Separado de varredura.ts porque aquele e
// "use node" (SDK do B2) e este roda no V8.

/**
 * URLs de arquivo referenciadas por um lote de documentos.
 *
 * Devolve so as URLs — nao os documentos — para o retorno nao carregar a tabela
 * inteira de volta para a action.
 */
export const loteUrls = internalQuery({
  args: {
    tabela: v.string(),
    cursor: v.union(v.string(), v.null()),
    limite: v.number(),
  },
  handler: async (ctx, { tabela, cursor, limite }) => {
    const p = await ctx.db
      // @ts-ignore tabela vem do TABELAS_COM_ARQUIVO, validado no chamador
      .query(tabela)
      .paginate({ cursor, numItems: limite });

    const urls: string[] = [];
    for (const doc of p.page) {
      urls.push(...urlsDoDocumento(tabela, doc as Record<string, unknown>));
    }

    return { urls, cursor: p.continueCursor, isDone: p.isDone };
  },
});
