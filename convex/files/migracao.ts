"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { apagarDoPublico, copiarParaPrivado, existeNoPublico, putObject } from "./helpers";
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
//   npx convex run files/migracao:migrar '{"repararTipos":true}' conserta tipo
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
  // Copias que estavam sem o tipo do arquivo e foram refeitas.
  reparados: number;
  // Copias possivelmente sem tipo cujo original ja foi apagado — nao ha mais
  // de onde recuperar o ContentType. Precisa de reupload manual.
  semOrigemParaReparar: number;
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
  repararTipos: boolean,
  r: Resultado,
  // Chaves copiadas que ficam para apagar do bucket aberto DEPOIS do patch.
  aLimpar: string[],
): Promise<string | null> {
  const parsed = parseFileUrl(url);

  if (parsed?.bucketKey === "privado") {
    r.jaMigrados++;
    // Uma rodada anterior pode ter copiado e deixado o original no bucket
    // aberto (mesma chave) — sem isto, o fluxo recomendado (rodar sem apagar,
    // conferir, rodar apagando) nunca apagaria nada. A fila tambem serve para
    // reparar copia que ficou sem o tipo do arquivo.
    //
    // So entra na fila quando ha o que fazer com ela: cada chave aqui custa
    // 3 HEADs no B2, e numa base grande isso sozinho estoura o tempo da action.
    if (!dryRun && (apagarOrigem || repararTipos)) aLimpar.push(parsed.key);
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
    const copia = await copiarParaPrivado(parsed.key);
    if (copia.acao === "semOrigem") {
      // O HEAD so devolve isto em 404 real: o arquivo sumiu do bucket aberto
      // sem nunca ter sido copiado. Nao reescreve o banco — a URL antiga fica
      // e o caso aparece no relatorio.
      r.falhas++;
      r.detalhes.push(`ORIGINAL AUSENTE (nao migrado): ${parsed.key}`);
      return null;
    }
    r.copiados++;
    aLimpar.push(parsed.key);
    return copia.url;
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
    // Revisita arquivos ja migrados so para consertar copia que ficou sem o
    // tipo. Opt-in porque custa 3 HEADs por arquivo.
    repararTipos: v.optional(v.boolean()),
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
    const repararTipos = args.repararTipos ?? false;
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
        reparados: 0,
        semOrigemParaReparar: 0,
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
                repararTipos,
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
            // Isolado: uma falha aqui nao pode abortar a acao inteira e perder
            // os contadores de tudo que ja rodou.
            try {
              // No-op quando a copia ja esta integra; recopia se ficou sem o
              // tipo do arquivo. Tem que vir ANTES de apagar: e o original que
              // guarda o ContentType certo.
              const copia = await copiarParaPrivado(key);
              if (copia.acao === "reparado") {
                r.reparados++;
                r.detalhes.push(`TIPO REPARADO: ${key}`);
              } else if (copia.acao === "semOrigem") {
                // Sem o original nao da para saber o tipo certo. Se a copia
                // estiver como octet-stream, so um reupload resolve.
                r.semOrigemParaReparar++;
              }

              if (!apagarOrigem) {
                if (await existeNoPublico(key)) r.pendentesDeLimpeza++;
                continue;
              }
              const res = await apagarDoPublico(key);
              if (res === "apagado") r.apagadosDoPublico++;
              else if (res === "falha") {
                r.pendentesDeLimpeza++;
                r.detalhes.push(`FALHA apagar do publico: ${key}`);
              }
              // "inexistente": arquivo re-hospedado, nunca esteve no publico.
            } catch (e) {
              r.falhas++;
              r.detalhes.push(
                `FALHA na limpeza de ${key} — ${e instanceof Error ? e.message : e}`,
              );
            }
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
