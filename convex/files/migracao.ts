"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { copiarParaPrivado, putObject } from "./helpers";
import { bucketForKey, generateObjectKey, parseFileUrl } from "./urls";
import { ALVOS } from "./migracaoDb";

// Migracao dos arquivos que ja existem para o bucket fechado (fase 3 do PRD
// docs/implementations/not-started/segregacao-buckets-lgpd.md).
//
// Rodar so DEPOIS que a fase 2 (frontend assinando a leitura) estiver no ar no
// mesmo ambiente: a partir daqui as URLs no banco deixam de abrir sozinhas.
//
// Idempotente — pode reprocessar quantas vezes precisar:
//  - arquivo ja no bucket fechado e ignorado
//  - copia so acontece se o objeto ainda nao existir no destino
//  - falha em um arquivo nao derruba o lote; a URL antiga fica e entra na
//    proxima rodada
//
//   npx convex run files/migracao:migrar '{"dryRun":true}'
//   npx convex run files/migracao:migrar '{}'

const PASTA_POR_ALVO: Record<string, string> = {
  "entidades.foto": "membros/fotos",
  "membros.cartaTransferencia": "membros/cartas-transferencia",
  "eduVoluntarios.certificadoCacUrl": "educacional/certificados-cac",
  inscricoesRetiro: "retiro-comprovantes",
  inscricoesAcampamento: "retiro-comprovantes",
};

type Resultado = {
  copiados: number;
  rehospedados: number;
  jaMigrados: number;
  ignorados: number;
  falhas: number;
  detalhes: string[];
};

function extensaoDe(contentType: string, url: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const doPath = url.split("?")[0].split(".").pop();
  return doPath && doPath.length <= 4 ? doPath : "bin";
}

/**
 * Resolve a URL nova de um arquivo. Devolve null quando nao ha nada a fazer
 * (ja migrado, ou e arquivo que continua publico de proposito).
 */
async function migrarUrl(
  url: string,
  pastaDestino: string,
  entityId: string,
  dryRun: boolean,
  r: Resultado,
): Promise<string | null> {
  const parsed = parseFileUrl(url);

  if (parsed?.bucketKey === "privado") {
    r.jaMigrados++;
    return null;
  }

  if (parsed?.bucketKey === "publico") {
    // Audio e capa continuam publicos; so migra o que a pasta manda fechar.
    let vaiParaPrivado = false;
    try {
      vaiParaPrivado = bucketForKey(parsed.key) === "privado";
    } catch {
      vaiParaPrivado = false; // pasta nao registrada: nao mexe
    }
    if (!vaiParaPrivado) {
      r.ignorados++;
      return null;
    }
    if (dryRun) {
      r.copiados++;
      r.detalhes.push(`COPIAR ${parsed.key}`);
      return null;
    }
    const nova = await copiarParaPrivado(parsed.key);
    r.copiados++;
    return nova;
  }

  // Host externo (foto que veio do formulario Tally): baixa e re-hospeda, para
  // o dado pessoal parar de morar em servidor de terceiro com link assinado.
  if (dryRun) {
    r.rehospedados++;
    r.detalhes.push(`REHOSPEDAR ${url.slice(0, 60)}`);
    return null;
  }
  const res = await fetch(url);
  if (!res.ok) {
    // Link do Tally expira; sem o arquivo, mantem a URL antiga e segue.
    r.falhas++;
    r.detalhes.push(`FALHA download ${res.status} ${url.slice(0, 60)}`);
    return null;
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const key = generateObjectKey(pastaDestino, entityId, extensaoDe(contentType, url));
  const nova = await putObject(key, new Uint8Array(await res.arrayBuffer()), contentType);
  r.rehospedados++;
  return nova;
}

export const migrar = internalAction({
  args: {
    // Sem alvo, roda todos.
    alvo: v.optional(v.string()),
    // So relata o que faria, sem tocar em B2 nem banco.
    dryRun: v.optional(v.boolean()),
    loteTamanho: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Record<string, Resultado>> => {
    const alvos = args.alvo ? [args.alvo] : [...ALVOS];
    const dryRun = args.dryRun ?? false;
    const limite = args.loteTamanho ?? 50;
    const geral: Record<string, Resultado> = {};

    for (const alvo of alvos) {
      const r: Resultado = {
        copiados: 0,
        rehospedados: 0,
        jaMigrados: 0,
        ignorados: 0,
        falhas: 0,
        detalhes: [],
      };
      const pasta = PASTA_POR_ALVO[alvo];
      let cursor: string | null = null;

      for (;;) {
        const lote: { cursor: string; isDone: boolean; docs: { id: string; entityId: string; urls: string[] }[] } =
          // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
          await ctx.runQuery(internal.files.migracaoDb.lote, { alvo, cursor, limite });

        for (const doc of lote.docs) {
          const trocas: { de: string; para: string }[] = [];
          for (const url of doc.urls) {
            try {
              const nova = await migrarUrl(url, pasta, doc.entityId, dryRun, r);
              if (nova) trocas.push({ de: url, para: nova });
            } catch (e) {
              r.falhas++;
              r.detalhes.push(
                `FALHA ${doc.id} ${url.slice(0, 50)} — ${e instanceof Error ? e.message : e}`,
              );
            }
          }
          if (trocas.length > 0 && !dryRun) {
            // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
            await ctx.runMutation(internal.files.migracaoDb.aplicar, {
              alvo,
              id: doc.id,
              trocas,
            });
          }
        }

        if (lote.isDone) break;
        cursor = lote.cursor;
      }

      // Detalhe demais polui o retorno quando ha muito arquivo.
      if (r.detalhes.length > 20) {
        const extras = r.detalhes.length - 20;
        r.detalhes = r.detalhes.slice(0, 20);
        r.detalhes.push(`… e mais ${extras}`);
      }
      geral[alvo] = r;
    }

    return geral;
  },
});
