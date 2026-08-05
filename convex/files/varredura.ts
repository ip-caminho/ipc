"use node";

import { v } from "convex/values";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { createS3Client, apagarDoPublico } from "./helpers";
import { getBucketName, parseFileUrl, type BucketKey } from "./urls";
import { TABELAS_COM_ARQUIVO } from "./orfaos";

// Encontra arquivo no B2 que nenhum registro do banco referencia (parte 3 da
// issue #212). A parte 1 impede que novos apareçam; esta varredura acha os que
// escaparem — e os que ja existiam antes dela.
//
// Precisa existir porque a migracao e o delete automatico trabalham a partir do
// BANCO: por construcao, nenhum dos dois enxerga um arquivo que ninguem aponta.
// Foi so inventariando o bucket que achamos os 12 orfaos de producao.
//
//   npx convex run files/varredura:varrerOrfaos '{}'                    relatorio
//   npx convex run files/varredura:varrerOrfaos '{"apagar":true}'       apaga
//
// ATENCAO: dev e producao usam os MESMOS buckets. Rodando em um ambiente, os
// arquivos do outro aparecem como orfaos — apagar sem conferir destruiria
// arquivo em uso do outro lado. Por isso `apagar` e opt-in e existe o
// `minIdadeHoras`.

// Arquivo recem-enviado ainda pode nao ter registro: o upload vai direto do
// browser para o B2 e a mutation que salva a URL vem depois. Sem essa folga, a
// varredura apagaria o arquivo de alguem no meio do preenchimento do formulario.
const GRACE_HORAS_PADRAO = 48;

type Achado = { bucket: BucketKey; key: string; kb: number; idadeHoras: number };

async function listarTudo(bucketKey: BucketKey) {
  const s3 = createS3Client();
  const bucket = getBucketName(bucketKey);
  const objetos: { key: string; size: number; modificado: Date }[] = [];
  let cursor: string | undefined;

  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: cursor }),
    );
    for (const o of r.Contents ?? []) {
      if (!o.Key) continue;
      objetos.push({ key: o.Key, size: o.Size ?? 0, modificado: o.LastModified ?? new Date(0) });
    }
    cursor = r.NextContinuationToken;
  } while (cursor);

  return objetos;
}

export const varrerOrfaos = internalAction({
  args: {
    // Sem isto, so relata.
    apagar: v.optional(v.boolean()),
    // Idade minima para considerar orfao (protege upload em andamento).
    minIdadeHoras: v.optional(v.number()),
    loteTamanho: v.optional(v.number()),
    // Chaves em uso no OUTRO ambiente, no formato "bucket:chave". Como dev e
    // producao dividem os buckets, sem isto a varredura de um lado enxerga os
    // arquivos do outro como orfaos. Medido: rodando no dev, 152 dos 153
    // "orfaos" estavam em uso em producao.
    //
    //   1) npx convex run files/varredura:varrerOrfaos '{"soReferenciadas":true}' --prod
    //   2) passe a lista em ignorarChaves ao rodar no dev (e vice-versa)
    ignorarChaves: v.optional(v.array(v.string())),
    // Devolve so o que o banco referencia, para alimentar o passo (2) acima.
    soReferenciadas: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apagar = args.apagar ?? false;
    const graceHoras = args.minIdadeHoras ?? GRACE_HORAS_PADRAO;
    const limite = args.loteTamanho ?? 200;
    const emUsoNoOutro = new Set(args.ignorarChaves ?? []);

    // 1. Tudo que o BANCO referencia, como "bucket:chave" (a URL pode estar em
    //    formato CDN, canonico ou legado — parseFileUrl normaliza os tres).
    const referenciadas = new Set<string>();
    let docsVarridos = 0;
    const urlsForaDoB2: string[] = [];

    for (const tabela of TABELAS_COM_ARQUIVO) {
      let cursor: string | null = null;
      for (;;) {
        const lote: { urls: string[]; cursor: string; isDone: boolean } =
          // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
          await ctx.runQuery(internal.files.varreduraDb.loteUrls, {
            tabela,
            cursor,
            limite,
          });
        for (const url of lote.urls) {
          docsVarridos++;
          const p = parseFileUrl(url);
          if (p) referenciadas.add(`${p.bucketKey}:${p.key}`);
          else urlsForaDoB2.push(url);
        }
        if (lote.isDone) break;
        cursor = lote.cursor;
      }
    }

    if (args.soReferenciadas) {
      return { referenciadas: [...referenciadas], total: referenciadas.size };
    }

    // 2. Tudo que existe nos buckets
    const agora = Date.now();
    const orfaos: Achado[] = [];
    const novosDemais: Achado[] = [];
    let objetosNoBucket = 0;
    let emUsoNoOutroAmbiente = 0;

    for (const bucketKey of ["publico", "privado"] as BucketKey[]) {
      for (const o of await listarTudo(bucketKey)) {
        objetosNoBucket++;
        const chave = `${bucketKey}:${o.key}`;
        if (referenciadas.has(chave)) continue;
        // Em uso do outro lado (dev/prod dividem os buckets): nao e orfao.
        if (emUsoNoOutro.has(chave)) {
          emUsoNoOutroAmbiente++;
          continue;
        }

        const idadeHoras = (agora - o.modificado.getTime()) / 3_600_000;
        const achado: Achado = {
          bucket: bucketKey,
          key: o.key,
          kb: Math.round(o.size / 1024),
          idadeHoras: Math.round(idadeHoras),
        };
        // Recente demais: pode ser upload em andamento, nao orfao.
        if (idadeHoras < graceHoras) novosDemais.push(achado);
        else orfaos.push(achado);
      }
    }

    // 3. Apaga so quando pedido explicitamente
    let apagados = 0;
    const falhas: string[] = [];
    if (apagar) {
      for (const o of orfaos) {
        if (o.bucket === "publico") {
          const r = await apagarDoPublico(o.key);
          if (r === "apagado") apagados++;
          else if (r === "falha") falhas.push(o.key);
        } else {
          // O delete do bucket fechado passa pelo mesmo caminho do resto do
          // sistema (deleteFile -> deleteFromB2), que resolve o bucket pela URL.
          // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
          await ctx.scheduler.runAfter(0, internal.files.upload.deleteFile, {
            url: `https://${process.env.BACKBLAZE_ENDPOINT}/${getBucketName("privado")}/${o.key}`,
          });
          apagados++;
        }
      }
    }

    const bytesOrfaos = orfaos.reduce((a, o) => a + o.kb, 0);
    return {
      resumo: {
        objetosNoBucket,
        referenciadosNoBanco: referenciadas.size,
        orfaos: orfaos.length,
        orfaosMB: +(bytesOrfaos / 1024).toFixed(1),
        ignoradosPorSeremRecentes: novosDemais.length,
        emUsoNoOutroAmbiente,
        apagados,
        falhas: falhas.length,
      },
      // Dev e prod dividem os buckets: o que e orfao aqui pode estar em uso la.
      aviso: emUsoNoOutro.size
        ? "Cruzado com o outro ambiente."
        : "SEM cruzamento: dev e producao compartilham os buckets, entao esta lista inclui arquivos em uso no outro ambiente. Rode com soReferenciadas la e passe em ignorarChaves antes de apagar.",
      orfaos: orfaos.slice(0, 50),
      truncado: Math.max(0, orfaos.length - 50),
      // URL que nao e do B2 (foto ainda no Tally): fica registrada porque e
      // dado pessoal fora do nosso controle, mas a varredura nao mexe nela.
      urlsForaDoB2: [...new Set(urlsForaDoB2)].slice(0, 20),
      docsVarridos,
      falhasAoApagar: falhas.slice(0, 20),
    };
  },
});
