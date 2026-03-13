"use node";

import { extractKeyFromUrl, toCdnUrl } from "./helpers";

/**
 * Download a file from B2 via CDN (public bucket).
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
 * Generate a public read URL via CDN.
 * With public bucket + Cloudflare CDN, no signing needed.
 */
export async function generatePresignedReadUrl(url: string): Promise<string | null> {
  const key = extractKeyFromUrl(url);
  if (!key) return null;
  return toCdnUrl(url);
}
