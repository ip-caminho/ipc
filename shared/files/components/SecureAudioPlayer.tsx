"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Slider } from "@/shared/components/ui/slider";
import { Button } from "@/shared/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface SecureAudioPlayerProps {
  url: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  inicioSermao?: number | null;
  fimSermao?: number | null;
  resumeFrom?: number | null;
}

const CDN_BASE = "https://cdn.yhc.com.br";

function toCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE)) return url;
  const match = url.match(/\/file\/[^/]+\/(.+)/);
  if (match) return `${CDN_BASE}/${match[1]}`;
  return url;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useAudioGain(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [ready, setReady] = useState(false);

  const init = useCallback(() => {
    if (sourceRef.current || !audioRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioRef.current);
      const gain = ctx.createGain();
      source.connect(gain);
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
      sourceRef.current = source;
      setReady(true);
    } catch {
      // CORS not available — stays on native volume
    }
  }, [audioRef]);

  const resume = useCallback(() => {
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
  }, []);

  const setGain = useCallback((v: number) => {
    if (gainRef.current) gainRef.current.gain.value = v;
  }, []);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return { init, resume, setGain, ready };
}

export function SecureAudioPlayer({
  url,
  onTimeUpdate,
  inicioSermao,
  fimSermao,
  resumeFrom,
}: SecureAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const seekingRef = useRef(false);
  const gain = useAudioGain(audioRef);

  const inicio = inicioSermao ?? 0;
  const hasSegment = inicioSermao != null;

  const segmentDuration = hasSegment
    ? (fimSermao ?? duration) - inicio
    : duration;

  const relativeTime = hasSegment ? currentTime - inicio : currentTime;

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);

    const fim = fimSermao ?? audio.duration;
    if (resumeFrom != null && resumeFrom >= inicio && resumeFrom < fim) {
      audio.currentTime = resumeFrom;
    } else if (hasSegment) {
      audio.currentTime = inicio;
    }
  }, [inicio, fimSermao, hasSegment, resumeFrom]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || seekingRef.current) return;

    const fim = fimSermao ?? audio.duration;
    if (hasSegment && audio.currentTime < inicio) {
      audio.currentTime = inicio;
      return;
    }
    if (hasSegment && audio.currentTime >= fim && !audio.paused) {
      audio.pause();
      audio.currentTime = fim;
      setPlaying(false);
    }

    setCurrentTime(audio.currentTime);
    if (onTimeUpdate && audio.duration) {
      onTimeUpdate(audio.currentTime, audio.duration);
    }
  }, [inicio, fimSermao, hasSegment, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    gain.init();
    gain.resume();

    if (audio.paused) {
      const fim = fimSermao ?? audio.duration;
      if (hasSegment && audio.currentTime >= fim) {
        audio.currentTime = inicio;
      }
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [inicio, fimSermao, hasSegment, gain]);

  const handleSliderChange = useCallback(([value]: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekingRef.current = true;
    const absoluteTime = hasSegment ? inicio + value : value;
    audio.currentTime = absoluteTime;
    setCurrentTime(absoluteTime);
    seekingRef.current = false;
  }, [inicio, hasSegment]);

  const handleVolumeChange = useCallback(([v]: number[]) => {
    setVolume(v);
    setMuted(v === 0);

    if (gain.ready) {
      gain.setGain(v);
      if (audioRef.current) {
        audioRef.current.volume = 1;
        audioRef.current.muted = v === 0;
      }
    } else {
      if (audioRef.current) {
        audioRef.current.volume = Math.min(v, 1);
        audioRef.current.muted = v === 0;
      }
    }
  }, [gain]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  }, [muted]);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [url]);

  const maxVolume = gain.ready ? 2 : 1;

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        src={toCdnUrl(url)}
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        muted={muted}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={togglePlay}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1 space-y-1">
          <Slider
            min={0}
            max={segmentDuration || 1}
            step={0.5}
            value={[Math.max(0, Math.min(relativeTime, segmentDuration))]}
            onValueChange={handleSliderChange}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{formatTime(Math.max(0, relativeTime))}</span>
            <span>{formatTime(segmentDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            min={0}
            max={maxVolume}
            step={0.05}
            value={[muted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            className="w-20 cursor-pointer"
          />
          {volume > 1 && (
            <span className="text-[10px] text-primary font-medium tabular-nums w-8">
              {Math.round(volume * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
