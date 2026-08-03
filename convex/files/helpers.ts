import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucketForKey, getBucketName, getStorageUrl, parseFileUrl } from "./urls";

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

// Cache-Control assinado no PUT. O cliente PRECISA enviar exatamente este valor
// no header, senao a assinatura nao bate (403). Por isso ele volta junto da
// uploadUrl: quem faz o PUT usa o valor que veio daqui, em vez de hardcodar.
const UPLOAD_CACHE_CONTROL = "public, max-age=31536000";

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
  const command = new PutObjectCommand({
    Bucket: getBucketName(bucketForKey(key)),
    Key: key,
    ContentType: contentType,
    CacheControl: UPLOAD_CACHE_CONTROL,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, publicUrl: getStorageUrl(key), cacheControl: UPLOAD_CACHE_CONTROL };
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
      CacheControl: UPLOAD_CACHE_CONTROL,
    })
  );
  return getStorageUrl(key);
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
