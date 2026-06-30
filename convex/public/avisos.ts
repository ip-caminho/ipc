import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

// Avisos — endpoint PÚBLICO (sem auth). Bloco "Esta semana" da home.
//
// Fonte = avisos REALMENTE dados no último culto de domingo, extraídos pela IA
// do áudio (gravacoes.iaAvisos) — e NÃO o cadastro manual da tabela `avisos`
// (que segue como pauta interna no chrMS). Contato/WhatsApp NÃO são expostos na
// página pública (dado pessoal — LGPD): só título/descrição/quando/onde.

export type AvisoCultoPublico = {
  titulo: string;
  descricao: string;
  quando?: string | null;
  onde?: string | null;
};

export type AvisosUltimoCulto = {
  data: string; // data do culto (YYYY-MM-DD)
  avisos: AvisoCultoPublico[];
};

// Avisos do culto mais recente publicado. Varre as gravações da mais recente
// para a mais antiga (índice by_data) e para na primeira PUBLICADO + SERMAO com
// avisos já extraídos — normalmente o 1º ou 2º documento. Enquanto o culto novo
// não foi processado pela IA, segue mostrando o do domingo anterior. Teto de
// varredura evita full scan caso não exista nenhuma (retorna null → seção some).
export const listUltimoCulto = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 8 }): Promise<AvisosUltimoCulto | null> => {
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
      data: culto.data,
      avisos: (culto.iaAvisos ?? [])
        .slice(0, Math.max(0, limit))
        .map((a) => ({
          titulo: a.titulo,
          descricao: a.descricao,
          quando: a.quando ?? null,
          onde: a.onde ?? null,
        })),
    };
  },
});
