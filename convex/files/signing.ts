"use node";

import { extractKeyFromUrl, getBucketName } from "./helpers";

let cachedAuth: { token: string; downloadUrl: string; expiresAt: number } | null = null;

/**
 * Authorize with B2 native API v2. Token is valid for 24h, cached in memory.
 */
async function getB2Auth(): Promise<{ token: string; downloadUrl: string }> {
  if (cachedAuth && Date.now() < cachedAuth.expiresAt) {
    return { token: cachedAuth.token, downloadUrl: cachedAuth.downloadUrl };
  }

  const keyId = process.env.AWS_ACCESS_KEY_ID!;
  const appKey = process.env.AWS_SECRET_ACCESS_KEY!;

  console.log("[B2 auth] authorizing with keyId:", keyId.substring(0, 8) + "...");

  const res = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: {
      Authorization: "Basic " + Buffer.from(`${keyId}:${appKey}`).toString("base64"),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[B2 auth] failed:", res.status, body);
    throw new Error(`B2 authorize failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  console.log("[B2 auth] success, downloadUrl:", data.downloadUrl);
  console.log("[B2 auth] allowed capabilities:", JSON.stringify(data.allowed));

  cachedAuth = {
    token: data.authorizationToken,
    downloadUrl: data.downloadUrl,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };

  return { token: cachedAuth.token, downloadUrl: cachedAuth.downloadUrl };
}

/**
 * Download a file from B2 server-side using the Authorization header.
 */
export async function fetchB2File(url: string): Promise<Buffer | null> {
  const key = extractKeyFromUrl(url);
  if (!key) return null;

  const bucket = getBucketName();
  const { token, downloadUrl } = await getB2Auth();
  const fileUrl = `${downloadUrl}/file/${bucket}/${key}`;

  const res = await fetch(fileUrl, {
    headers: { Authorization: token },
  });

  if (!res.ok) {
    console.error("[B2 fetch] failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate a download URL using B2 native authorization.
 */
export async function generatePresignedReadUrl(url: string): Promise<string | null> {
  const key = extractKeyFromUrl(url);
  if (!key) return null;

  const bucket = getBucketName();
  const { token, downloadUrl } = await getB2Auth();
  const readUrl = `${downloadUrl}/file/${bucket}/${key}?Authorization=${encodeURIComponent(token)}`;

  // Test server-side
  try {
    const test = await fetch(readUrl, { method: "HEAD" });
    console.log("[B2 read] test:", test.status, test.statusText, "content-type:", test.headers.get("content-type"));
    if (!test.ok) {
      const body = await test.text();
      console.error("[B2 read] error:", body.substring(0, 300));
    }
  } catch (e) {
    console.error("[B2 read] fetch error:", e);
  }

  return readUrl;
}
