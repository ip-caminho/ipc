import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  bucketForKey,
  getBucketName,
  getPrivateCanonicalUrl,
  getStorageUrl,
  parseFileUrl,
  privadoIndisponivel,
} from "./urls";

// Reexporta o que nao depende do SDK, para os call sites existentes seguirem
// importando de "files/helpers". Codigo novo em runtime V8 deve importar de
// "files/urls" direto (sem SDK no bundle).
export {
  CDN_BASE,
  FOLDER_BUCKET,
  generateObjectKey,
  getPublicUrl,
  getStorageUrl,
  parseFileUrl,
  toCdnUrl,
  bucketForKey,
  folderFromKey,
  privadoIndisponivel,
  type BucketKey,
} from "./urls";

// Cache-Control gravado no objeto. O cliente PRECISA enviar exatamente este
// valor no PUT, senao a assinatura nao bate (403) — por isso ele volta junto da
// uploadUrl, em vez de ser hardcoded no frontend.
//
// No bucket fechado tem que ser `private`: com `public` de um ano, um cache
// compartilhado (ou o proprio browser) guardaria o arquivo muito depois de a
// assinatura de 1h expirar.
const CACHE_CONTROL_PUBLICO = "public, max-age=31536000";
const CACHE_CONTROL_PRIVADO = "private, max-age=3600";

function cacheControlDe(key: string): string {
  // Enquanto o bucket fechado nao existir, o arquivo vai para o aberto de
  // qualquer forma — e, mais importante, o frontend ainda no ar manda o valor
  // antigo hardcoded no PUT. Mudar aqui antes dele quebraria todo upload de
  // foto/documento com 403 (o header assinado tem que bater com o enviado).
  if (privadoIndisponivel()) return CACHE_CONTROL_PUBLICO;
  return bucketForKey(key) === "privado" ? CACHE_CONTROL_PRIVADO : CACHE_CONTROL_PUBLICO;
}

export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: `https://${process.env.BACKBLAZE_ENDPOINT}`,
    region: process.env.AWS_REGION!,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Presigned PUT. O bucket vem da pasta da chave (fail-closed em bucketForKey),
 * nunca do chamador. `publicUrl` e a URL a persistir no banco: CDN no bucket
 * aberto, canonica S3 no fechado.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; cacheControl: string }> {
  const s3 = createS3Client();
  const cacheControl = cacheControlDe(key);
  const command = new PutObjectCommand({
    Bucket: getBucketName(bucketForKey(key)),
    Key: key,
    ContentType: contentType,
    CacheControl: cacheControl,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, publicUrl: getStorageUrl(key), cacheControl };
}

/**
 * Upload server-side (sem passar pelo browser). Mesma resolucao de bucket do
 * presigned — usado pelo import de foto do Tally e pela extracao de audio.
 */
export async function putObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string
): Promise<string> {
  const s3 = createS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: getBucketName(bucketForKey(key)),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControlDe(key),
    })
  );
  return getStorageUrl(key);
}

// Tipo default do S3 quando o objeto sobe sem ContentType. Fixar o fallback
// evita recopiar para sempre: sem ele, comparar `undefined` (origem) com o
// default (destino) nunca converge.
const TIPO_DESCONHECIDO = "application/octet-stream";

/** So 404 significa "nao existe". Timeout, throttle e 403 tem que estourar. */
function ehNaoEncontrado(e: unknown): boolean {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    err?.name === "NotFound" ||
    err?.name === "NoSuchKey" ||
    err?.$metadata?.httpStatusCode === 404
  );
}

/**
 * HEAD que devolve null so quando o objeto realmente nao existe.
 *
 * Tratar erro transitorio como ausencia e perigoso aqui: a migracao concluiria
 * que a copia ja foi feita, reescreveria o banco para um objeto inexistente e,
 * numa rodada com apagarOrigem, apagaria o unico arquivo real.
 */
async function headOuNull(s3: S3Client, bucket: string, key: string) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e) {
    if (ehNaoEncontrado(e)) return null;
    throw e;
  }
}

export type ResultadoCopia = {
  url: string;
  // "semOrigem": original ja apagado — se a copia estiver sem tipo, nao ha
  // mais de onde recuperar o ContentType correto.
  acao: "copiado" | "reparado" | "jaOk" | "semOrigem";
};

/**
 * Copia um objeto do bucket aberto para o fechado, mantendo a mesma chave.
 * Idempotente: nao recopia quando o destino ja esta integro, mas recopia se a
 * copia perdeu o tipo do arquivo.
 */
export async function copiarParaPrivado(key: string): Promise<ResultadoCopia> {
  const s3 = createS3Client();
  const destino = getBucketName("privado");
  const origem = getBucketName("publico");
  const url = getPrivateCanonicalUrl(key);

  const original = await headOuNull(s3, origem, key);
  if (!original) return { url, acao: "semOrigem" };

  const tipo = original.ContentType ?? TIPO_DESCONHECIDO;
  const copia = await headOuNull(s3, destino, key);
  if (copia && (copia.ContentType ?? TIPO_DESCONHECIDO) === tipo) {
    return { url, acao: "jaOk" };
  }

  await s3.send(
    new CopyObjectCommand({
      Bucket: destino,
      Key: key,
      // O B2 espera "<bucket>/<key>" com a chave escapada.
      CopySource: `${origem}/${key.split("/").map(encodeURIComponent).join("/")}`,
      // REPLACE troca TODOS os metadados: sem herdar o "public, max-age=1 ano"
      // do objeto antigo, mas por isso o ContentType tem que ser repassado na
      // mao, senao vira binary/octet-stream.
      MetadataDirective: "REPLACE",
      ContentType: tipo,
      CacheControl: CACHE_CONTROL_PRIVADO,
    })
  );
  return { url, acao: copia ? "reparado" : "copiado" };
}

/**
 * Se o original ainda ocupa a chave antiga no bucket aberto. Erro que nao seja
 * 404 estoura: dizer "nao existe" por falha de rede reportaria o vazamento
 * como fechado sem estar.
 */
export async function existeNoPublico(key: string): Promise<boolean> {
  const s3 = createS3Client();
  return (await headOuNull(s3, getBucketName("publico"), key)) !== null;
}

/**
 * Apaga o objeto do bucket ABERTO depois de a copia estar confirmada e a URL
 * ja reescrita no banco. Sem isto, o arquivo migrado continuaria acessivel sem
 * login na chave antiga do CDN — o vazamento que a migracao existe para fechar.
 */
export async function apagarDoPublico(
  key: string
): Promise<"apagado" | "inexistente" | "falha"> {
  const s3 = createS3Client();
  const bucket = getBucketName("publico");

  // Distingue "nao havia nada" de "nao consegui apagar" — sem isso, arquivo
  // re-hospedado (chave nova, que nunca esteve no publico) contaria como
  // limpeza feita e mascararia uma falha real. Erro transitorio vira "falha",
  // nunca "inexistente".
  try {
    if ((await headOuNull(s3, bucket, key)) === null) return "inexistente";
  } catch {
    return "falha";
  }

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return "apagado";
  } catch {
    return "falha";
  }
}

export async function deleteFromB2(url: string): Promise<boolean> {
  const parsed = parseFileUrl(url);
  if (!parsed) return false;

  const s3 = createS3Client();
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: getBucketName(parsed.bucketKey),
        Key: parsed.key,
      })
    );
    return true;
  } catch {
    return false;
  }
}
