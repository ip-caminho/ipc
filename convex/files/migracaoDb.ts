import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Leitura/escrita da migracao de arquivos para o bucket fechado. Fica separado
// de migracao.ts porque aquele e "use node" (SDK do B2) e este roda no V8.

// Cada alvo e um campo (ou conjunto de campos) que guarda URL de arquivo.
export const ALVOS = [
  "entidades.foto",
  "membros.cartaTransferencia",
  "eduVoluntarios.certificadoCacUrl",
  "inscricoesRetiro",
  "inscricoesAcampamento",
] as const;

type Doc = { id: string; entityId: string; urls: string[] };

export const lote = internalQuery({
  args: {
    alvo: v.string(),
    cursor: v.union(v.string(), v.null()),
    limite: v.number(),
  },
  handler: async (ctx, { alvo, cursor, limite }) => {
    const opts = { cursor, numItems: limite };

    switch (alvo) {
      case "entidades.foto": {
        const p = await ctx.db.query("entidades").paginate(opts);
        return resposta(
          p,
          p.page.filter((d) => d.foto).map((d) => ({ id: d._id, entityId: d._id, urls: [d.foto!] })),
        );
      }
      case "membros.cartaTransferencia": {
        const p = await ctx.db.query("membros").paginate(opts);
        return resposta(
          p,
          p.page
            .filter((d) => d.cartaTransferencia)
            .map((d) => ({ id: d._id, entityId: d._id, urls: [d.cartaTransferencia!] })),
        );
      }
      case "eduVoluntarios.certificadoCacUrl": {
        const p = await ctx.db.query("eduVoluntarios").paginate(opts);
        return resposta(
          p,
          p.page
            .filter((d) => d.certificadoCacUrl)
            .map((d) => ({ id: d._id, entityId: d._id, urls: [d.certificadoCacUrl!] })),
        );
      }
      case "inscricoesRetiro": {
        const p = await ctx.db.query("inscricoesRetiro").paginate(opts);
        return resposta(p, p.page.map(urlsDeInscricao).filter((d) => d.urls.length > 0));
      }
      case "inscricoesAcampamento": {
        const p = await ctx.db.query("inscricoesAcampamento").paginate(opts);
        return resposta(p, p.page.map(urlsDeInscricao).filter((d) => d.urls.length > 0));
      }
      default:
        throw new Error(`Alvo desconhecido: ${alvo}`);
    }
  },
});

function resposta(
  p: { continueCursor: string; isDone: boolean },
  docs: Doc[],
): { cursor: string; isDone: boolean; docs: Doc[] } {
  return { cursor: p.continueCursor, isDone: p.isDone, docs };
}

// Comprovante vive em dois lugares na inscricao: recebimentos ja conferidos e
// comprovantes pendentes de conferencia.
function urlsDeInscricao(d: {
  _id: string;
  recebimentos: { comprovanteUrl?: string }[];
  comprovantesPendentes?: { comprovanteUrl: string }[];
}): Doc {
  const urls = [
    ...d.recebimentos.map((r) => r.comprovanteUrl),
    ...(d.comprovantesPendentes ?? []).map((c) => c.comprovanteUrl),
  ].filter((u): u is string => !!u);
  return { id: d._id, entityId: d._id, urls };
}

/**
 * Aplica as URLs novas. Recebe o de/para porque a copia no B2 acontece na
 * action; aqui so o documento e reescrito.
 */
export const aplicar = internalMutation({
  args: {
    alvo: v.string(),
    id: v.string(),
    trocas: v.array(v.object({ de: v.string(), para: v.string() })),
  },
  handler: async (ctx, { alvo, id, trocas }) => {
    const mapa = new Map(trocas.map((t) => [t.de, t.para]));
    const nova = (u: string | undefined) => (u ? (mapa.get(u) ?? u) : u);

    switch (alvo) {
      case "entidades.foto": {
        const d = await ctx.db.get(id as Id<"entidades">);
        if (!d?.foto) return;
        await ctx.db.patch(d._id, { foto: nova(d.foto) });
        return;
      }
      case "membros.cartaTransferencia": {
        const d = await ctx.db.get(id as Id<"membros">);
        if (!d?.cartaTransferencia) return;
        await ctx.db.patch(d._id, { cartaTransferencia: nova(d.cartaTransferencia) });
        return;
      }
      case "eduVoluntarios.certificadoCacUrl": {
        const d = await ctx.db.get(id as Id<"eduVoluntarios">);
        if (!d?.certificadoCacUrl) return;
        await ctx.db.patch(d._id, { certificadoCacUrl: nova(d.certificadoCacUrl) });
        return;
      }
      case "inscricoesRetiro": {
        const d = await ctx.db.get(id as Id<"inscricoesRetiro">);
        if (!d) return;
        await ctx.db.patch(d._id, {
          recebimentos: d.recebimentos.map((r) => ({ ...r, comprovanteUrl: nova(r.comprovanteUrl) })),
          comprovantesPendentes: d.comprovantesPendentes?.map((c) => ({
            ...c,
            comprovanteUrl: nova(c.comprovanteUrl)!,
          })),
        });
        return;
      }
      case "inscricoesAcampamento": {
        const d = await ctx.db.get(id as Id<"inscricoesAcampamento">);
        if (!d) return;
        await ctx.db.patch(d._id, {
          recebimentos: d.recebimentos.map((r) => ({ ...r, comprovanteUrl: nova(r.comprovanteUrl) })),
          comprovantesPendentes: d.comprovantesPendentes?.map((c) => ({
            ...c,
            comprovanteUrl: nova(c.comprovanteUrl)!,
          })),
        });
        return;
      }
      default:
        throw new Error(`Alvo desconhecido: ${alvo}`);
    }
  },
});
