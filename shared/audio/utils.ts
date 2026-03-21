const CDN_BASE = "https://cdn.yhc.com.br";

export function toCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE)) return url;
  const match = url.match(/\/file\/[^/]+\/(.+)/);
  if (match) return `${CDN_BASE}/${match[1]}`;
  return url;
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
