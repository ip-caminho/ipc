"use node";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client } from "./helpers";
import { getBucketName, parseFileUrl, toCdnUrl } from "./urls";

// Validade da URL assinada de leitura. Curta o bastante para o link vazado
// morrer sozinho, longa o bastante para o browser cachear a imagem na sessao.
const READ_URL_TTL_SECONDS = 3600;

/**
 * Download de arquivo do bucket aberto (via CDN). Nao serve para o bucket
 * fechado — la a leitura passa por generatePresignedReadUrl.
 */
export async function fetchB2File(url: string): Promise<Buffer | null> {
  const cdnUrl = toCdnUrl(url);

  const res = await fetch(cdnUrl);
  if (!res.ok) {
    console.error("[CDN fetch] failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * URL de leitura conforme o bucket:
 *  - aberto  -> CDN (bucket publico + Cloudflare, sem assinatura)
 *  - fechado -> GET presigned que expira
 *  - host desconhecido -> passthrough (ex: fotos ainda hospedadas no Tally;
 *    devolver null aqui apagaria essas imagens da tela)
 */
export async function generatePresignedReadUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const parsed = parseFileUrl(url);
  if (!parsed) return url;
  if (parsed.bucketKey === "publico") return toCdnUrl(url);

  const s3 = createS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName("privado"),
    Key: parsed.key,
  });
  return await getSignedUrl(s3, command, { expiresIn: READ_URL_TTL_SECONDS });
}

/**
 * Versao em lote — uma unica action resolve a tela inteira (listas de avatar),
 * em vez de uma chamada por imagem.
 */
export async function generatePresignedReadUrls(
  urls: (string | null)[]
): Promise<(string | null)[]> {
  // null = leitura negada para este usuario; nao assina.
  return await Promise.all(urls.map((url) => (url ? generatePresignedReadUrl(url) : null)));
}
