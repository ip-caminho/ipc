"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { apagarDoPublico, copiarParaPrivado, putObject } from "./helpers";
import { bucketForKey, generateObjectKey, parseFileUrl, privadoIndisponivel } from "./urls";
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
//   npx convex run files/migracao:migrar '{"dryRun":true}'   ve o que faria
//   npx convex run files/migracao:migrar '{}'                copia/re-hospeda
//   npx convex run files/migracao:migrar '{"apagarOrigem":true}'  fecha o antigo
//
// ATENCAO: enquanto `pendentesDeLimpeza` nao chegar a zero, o arquivo migrado
// continua acessivel SEM login na chave antiga do CDN — o vazamento so fecha na
// rodada com apagarOrigem.

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
  // Objetos copiados que continuam no bucket ABERTO — ou seja, ainda abrem sem
  // login na chave antiga do CDN. Zerar isto e o que fecha o vazamento.
  pendentesDeLimpeza: number;
  apagadosDoPublico: number;
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
  apagarOrigem: boolean,
  r: Resultado,
  // Chaves copiadas que ficam para apagar do bucket aberto DEPOIS do patch.
  aLimpar: string[],
): Promise<string | null> {
  const parsed = parseFileUrl(url);

  if (parsed?.bucketKey === "privado") {
    r.jaMigrados++;
    // Uma rodada anterior pode ter copiado e deixado o original no bucket
    // aberto (mesma chave) — sem isto, o fluxo recomendado (rodar sem apagar,
    // conferir, rodar apagando) nunca apagaria nada. So entra na fila quando a
    // limpeza foi pedida: aqui nao se sabe se ha original la, e contar como
    // pendente inflaria o numero com os arquivos re-hospedados.
    if (!dryRun && apagarOrigem) aLimpar.push(parsed.key);
    return null;
  }

  if (parsed?.bucketKey === "publico") {
    // Audio e capa continuam publicos; so migra o que a pasta manda fechar.
    let vaiParaPrivado = false;
    let pastaDesconhecida = false;
    try {
      vaiParaPrivado = bucketForKey(parsed.key) === "privado";
    } catch {
      // Pasta que ninguem registrou: pode ser um formato legado que ficaria
      // publico para sempre sem ninguem perceber. Denuncia em vez de ignorar
      // em silencio (foi assim que "acampamento-comprovantes" apareceu).
      pastaDesconhecida = true;
    }
    if (!vaiParaPrivado) {
      r.ignorados++;
      if (pastaDesconhecida) {
        r.detalhes.push(`PASTA NAO REGISTRADA (segue publica): ${parsed.key}`);
      }
      return null;
    }
    if (dryRun) {
      r.copiados++;
      r.detalhes.push(`COPIAR ${parsed.key}`);
      return null;
    }
    const nova = await copiarParaPrivado(parsed.key);
    r.copiados++;
    aLimpar.push(parsed.key);
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
    // Apaga o original do bucket aberto depois de copiar E reescrever o banco.
    // Padrao false: rode uma vez sem, confira, e so entao rode com true. So
    // enquanto isso nao rodar o arquivo continua aberto na chave antiga.
    apagarOrigem: v.optional(v.boolean()),
    loteTamanho: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Record<string, Resultado>> => {
    // Sem o bucket fechado configurado, getBucketName("privado") cai no aberto:
    // a "copia" acharia o proprio arquivo de origem e a migracao reescreveria a
    // base inteira sem ter movido nada. Melhor nao comecar.
    if (privadoIndisponivel()) {
      throw new Error(
        "BACKBLAZE_BUCKET_PRIVADO nao configurado — configure antes de migrar",
      );
    }
    const alvos = args.alvo ? [args.alvo] : [...ALVOS];
    const dryRun = args.dryRun ?? false;
    const apagarOrigem = args.apagarOrigem ?? false;
    const limite = args.loteTamanho ?? 50;
    const geral: Record<string, Resultado> = {};

    for (const alvo of alvos) {
      const r: Resultado = {
        copiados: 0,
        rehospedados: 0,
        jaMigrados: 0,
        ignorados: 0,
        falhas: 0,
        pendentesDeLimpeza: 0,
        apagadosDoPublico: 0,
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
          const aLimpar: string[] = [];
          for (const url of doc.urls) {
            try {
              const nova = await migrarUrl(
                url,
                pasta,
                doc.entityId,
                dryRun,
                apagarOrigem,
                r,
                aLimpar,
              );
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

          // So agora o original pode sair: a copia esta no destino e o banco ja
          // aponta para ela. Na ordem inversa, uma falha no patch deixaria o
          // registro apontando para arquivo apagado.
          for (const key of aLimpar) {
            if (!apagarOrigem) {
              r.pendentesDeLimpeza++;
              continue;
            }
            const res = await apagarDoPublico(key);
            if (res === "apagado") r.apagadosDoPublico++;
            else if (res === "falha") {
              r.pendentesDeLimpeza++;
              r.detalhes.push(`FALHA apagar do publico: ${key}`);
            }
            // "inexistente": arquivo re-hospedado, nunca esteve no publico.
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
