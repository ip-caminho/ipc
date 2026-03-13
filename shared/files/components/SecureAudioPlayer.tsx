"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface SecureAudioPlayerProps {
  url: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function SecureAudioPlayer({ url, onTimeUpdate }: SecureAudioPlayerProps) {
  const getReadUrl = useAction(api.files.upload.getReadUrl);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getReadUrl({ url })
      .then((result) => {
        if (!cancelled) {
          setSignedUrl(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url, getReadUrl]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando audio...
      </div>
    );
  }

  if (error || !signedUrl) {
    return <p className="text-xs text-destructive">Erro ao carregar audio</p>;
  }

  return (
    <audio
      controls
      src={signedUrl}
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
