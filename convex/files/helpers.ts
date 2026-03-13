import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export function getBucketName(): string {
  return process.env.BACKBLAZE_BUCKET_NAME!;
}

export function getPublicUrl(key: string): string {
  const bucketName = getBucketName();
  const endpoint = process.env.BACKBLAZE_ENDPOINT!;
  // s3.us-east-005.backblazeb2.com → f005.backblazeb2.com
  const regionMatch = endpoint.match(/s3\.(us-\w+-\d+)/);
  const regionNum = regionMatch ? regionMatch[1].split("-").pop() : "005";
  return `https://f${regionNum}.backblazeb2.com/file/${bucketName}/${key}`;
}

export function generateObjectKey(
  folder: string,
  entityId: string,
  extension: string
): string {
  const timestamp = Date.now();
  return `${folder}/${entityId}_${timestamp}.${extension}`;
}

export function extractKeyFromUrl(url: string): string | null {
  const bucketName = getBucketName();
  const pattern = `/file/${bucketName}/`;
  const idx = url.indexOf(pattern);
  if (idx === -1) return null;
  return url.substring(idx + pattern.length);
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const s3 = createS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicUrl = getPublicUrl(key);
  return { uploadUrl, publicUrl };
}

export async function deleteFromB2(url: string): Promise<boolean> {
  const key = extractKeyFromUrl(url);
  if (!key) return false;

  const s3 = createS3Client();
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}
