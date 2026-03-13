"use client";

interface SecureAudioPlayerProps {
  url: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const CDN_BASE = "https://cdn.yhc.com.br";

/** Convert legacy B2 direct URLs to CDN URLs */
function toCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE)) return url;
  const match = url.match(/\/file\/[^/]+\/(.+)/);
  if (match) return `${CDN_BASE}/${match[1]}`;
  return url;
}

export function SecureAudioPlayer({ url, onTimeUpdate }: SecureAudioPlayerProps) {
  return (
    <audio
      controls
      src={toCdnUrl(url)}
      className="w-full"
      onTimeUpdate={
        onTimeUpdate
          ? (e) => {
              const audio = e.currentTarget;
              if (audio.duration) onTimeUpdate(audio.currentTime, audio.duration);
            }
          : undefined
      }
    />
  );
}
