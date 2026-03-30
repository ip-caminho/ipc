"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toCdnUrl } from "./utils";

export interface AudioTrack {
  url: string;
  title: string;
  artist?: string;
  gravacaoId?: Id<"gravacoes">;
  inicioSermao?: number | null;
  fimSermao?: number | null;
  resumeFrom?: number | null;
}

export interface AudioPlayerState {
  track: AudioTrack | null;
  isPlaying: boolean;
  isActive: boolean;
  relativeTime: number;
  segmentDuration: number;
  volume: number;
  maxVolume: number;
  duration: number;
}

export interface AudioPlayerActions {
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seek: (relativeSeconds: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (v: number) => void;
  close: () => void;
}

export type AudioPlayerContextType = AudioPlayerState & AudioPlayerActions;

export const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

function trackKey(t: AudioTrack): string {
  return `${t.url}|${t.inicioSermao ?? ""}|${t.fimSermao ?? ""}`;
}

const HEARTBEAT_INTERVAL = 15_000;

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const pendingResumeRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const lastHeartbeatRef = useRef(0);
  const currentTrackKeyRef = useRef<string>("");
  const trackRef = useRef<AudioTrack | null>(null);

  // GainNode for volume boost (0-2x)
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [gainReady, setGainReady] = useState(false);

  // @ts-ignore Convex TS2589
  const heartbeat = useMutation(api.gravacoes.escutas.heartbeat);

  const inicio = track?.inicioSermao ?? 0;
  const hasSegment = track?.inicioSermao != null;
  const fim = track?.fimSermao ?? duration;
  const segmentDuration = hasSegment ? fim - inicio : duration;
  const relativeTime = hasSegment ? currentTime - inicio : currentTime;
  const maxVolume = gainReady ? 2 : 1;

  const initGain = useCallback(() => {
    const audio = audioRef.current;
    if (sourceRef.current || !audio) return;
    // Skip GainNode on mobile — avoids CORS issues with CDN
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile) return;
    try {
      audio.crossOrigin = "anonymous";
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      source.connect(gain);
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
      sourceRef.current = source;
      setGainReady(true);
    } catch {
      audio.crossOrigin = "";
    }
  }, []);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  // --- Audio event handlers ---

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    const t = trackRef.current;
    if (!audio) return;
    setDuration(audio.duration);

    const resume = pendingResumeRef.current;
    const segStart = t?.inicioSermao ?? 0;
    const segEnd = t?.fimSermao ?? audio.duration;
    const hasSeg = t?.inicioSermao != null;

    // Resume from last position, but if too close to the end (< 10s), restart from beginning
    if (resume != null && resume >= segStart && resume < segEnd - 10) {
      audio.currentTime = resume;
    } else if (hasSeg) {
      audio.currentTime = segStart;
    }
    pendingResumeRef.current = null;
  }, []);

  const handleCanPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !pendingPlayRef.current) return;
    pendingPlayRef.current = false;
    audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    const t = trackRef.current;
    if (!audio) return;

    const segStart = t?.inicioSermao ?? 0;
    const hasSegs = t?.inicioSermao != null;
    const dur = audio.duration;

    // Skip boundary checks if duration not yet available
    if (!dur || !isFinite(dur)) {
      setCurrentTime(audio.currentTime);
      return;
    }

    const segEnd = t?.fimSermao ?? dur;

    if (hasSegs && audio.currentTime < segStart) {
      audio.currentTime = segStart;
      return;
    }
    if (hasSegs && audio.currentTime >= segEnd && !audio.paused) {
      audio.pause();
      audio.currentTime = segEnd;
      setIsPlaying(false);
    }

    setCurrentTime(audio.currentTime);

    // Heartbeat
    if (t?.gravacaoId) {
      const now = Date.now();
      if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL) {
        lastHeartbeatRef.current = now;
        heartbeat({
          gravacaoId: t.gravacaoId,
          currentTime: Math.round(audio.currentTime),
          duration: Math.round(audio.duration),
        }).catch(() => {});
      }
    }
  }, [heartbeat]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // --- Actions ---

  const play = useCallback((newTrack: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    initGain();
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();

    const newKey = trackKey(newTrack);
    if (newKey === currentTrackKeyRef.current && !audio.paused) {
      return;
    }

    if (newKey === currentTrackKeyRef.current && audio.paused) {
      audio.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    // New track — load and play
    currentTrackKeyRef.current = newKey;
    pendingResumeRef.current = newTrack.resumeFrom ?? null;
    lastHeartbeatRef.current = 0;
    trackRef.current = newTrack;
    setTrack(newTrack);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);

    const cdnUrl = toCdnUrl(newTrack.url);
    audio.crossOrigin = "anonymous";
    audio.src = cdnUrl;
    pendingPlayRef.current = true;
    audio.load();
  }, [initGain]);

  const pause = useCallback(() => {
    pendingPlayRef.current = false;
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    audioRef.current?.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
      const segEnd = track.fimSermao ?? audio.duration;
      const hasSegs = track.inicioSermao != null;
      if (hasSegs && audio.currentTime >= segEnd) {
        audio.currentTime = track.inicioSermao ?? 0;
      }
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [track]);

  const seek = useCallback((relativeSeconds: number) => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const segStart = track.inicioSermao ?? 0;
    const hasSegs = track.inicioSermao != null;
    const absolute = hasSegs ? segStart + relativeSeconds : relativeSeconds;
    audio.currentTime = absolute;
    setCurrentTime(absolute);
  }, [track]);

  const seekRelative = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const segStart = track.inicioSermao ?? 0;
    const segEnd = track.fimSermao ?? audio.duration;
    const newTime = Math.max(segStart, Math.min(segEnd, audio.currentTime + delta));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [track]);

  const setVolume = useCallback((v: number) => {
    const max = gainRef.current ? 2 : 1;
    const clamped = Math.max(0, Math.min(max, v));
    setVolumeState(clamped);

    if (gainRef.current) {
      gainRef.current.gain.value = clamped;
      if (audioRef.current) {
        audioRef.current.volume = 1;
        audioRef.current.muted = clamped === 0;
      }
    } else if (audioRef.current) {
      audioRef.current.volume = Math.min(clamped, 1);
      audioRef.current.muted = clamped === 0;
    }
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    pendingPlayRef.current = false;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    trackRef.current = null;
    setTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    currentTrackKeyRef.current = "";
  }, []);

  const ctx: AudioPlayerContextType = {
    track,
    isPlaying,
    isActive: track != null,
    relativeTime: Math.max(0, relativeTime),
    segmentDuration,
    volume,
    maxVolume,
    duration,
    play,
    pause,
    resume,
    togglePlayPause,
    seek,
    seekRelative,
    setVolume,
    close,
  };

  return (
    <AudioPlayerContext.Provider value={ctx}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onEnded={handleEnded}
        style={{ display: "none" }}
      />
    </AudioPlayerContext.Provider>
  );
}
