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
import {
  enfileirarHeartbeat,
  lerHeartbeatsPendentes,
  limparHeartbeat,
} from "@shared/offline/db";

export interface AudioTrack {
  /** Fonte a tocar: URL do CDN ou object URL de um audio guardado offline. */
  url: string;
  title: string;
  artist?: string;
  gravacaoId?: Id<"gravacoes">;
  /** Bordas do trecho, em segundos do culto completo. */
  inicioSermao?: number | null;
  fimSermao?: number | null;
  /** Ultimo segundo ouvido (do culto completo). */
  resumeFrom?: number | null;
  /**
   * Segundo do culto onde a fonte comeca. 0 para o arquivo completo; > 0
   * quando a fonte e um trecho guardado offline.
   */
  srcOffset?: number;
  /** Duracao do culto completo — mantem o heartbeat coerente com fonte parcial. */
  duracaoTotal?: number;
  /** URL do CDN, quando `url` e um blob offline. Usada se o blob nao tocar. */
  fallbackUrl?: string;
  /** Chamado quando a fonte offline falha e o player cai para o CDN. */
  onErroFonte?: () => void;
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
  playbackRate: number;
}

export interface AudioPlayerActions {
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seek: (relativeSeconds: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (v: number) => void;
  setPlaybackRate: (r: number) => void;
  close: () => void;
}

export type AudioPlayerContextType = AudioPlayerState & AudioPlayerActions;

export const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

function trackKey(t: AudioTrack): string {
  return `${t.gravacaoId ?? t.url}|${t.inicioSermao ?? ""}|${t.fimSermao ?? ""}`;
}

/** Bordas do trecho convertidas para o tempo da fonte que esta tocando. */
function bordasLocais(t: AudioTrack | null, duracaoFonte: number) {
  const offset = t?.srcOffset ?? 0;
  const temSegmento = t?.inicioSermao != null;
  const inicio = temSegmento ? Math.max(0, (t!.inicioSermao as number) - offset) : 0;
  const fim = t?.fimSermao != null ? (t.fimSermao as number) - offset : duracaoFonte;
  return { inicio, fim, temSegmento, offset };
}

const HEARTBEAT_INTERVAL = 15_000;

export const VELOCIDADES = [1, 1.25, 1.5, 1.75, 2] as const;
const STORAGE_VELOCIDADE = "ipc:audio:playbackRate";

function velocidadeSalva(): number {
  if (typeof window === "undefined") return 1;
  try {
    const bruto = window.localStorage.getItem(STORAGE_VELOCIDADE);
    const valor = bruto ? parseFloat(bruto) : 1;
    return VELOCIDADES.includes(valor as (typeof VELOCIDADES)[number]) ? valor : 1;
  } catch {
    return 1;
  }
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const pendingResumeRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const lastHeartbeatRef = useRef(0);
  const currentTrackKeyRef = useRef<string>("");
  const trackRef = useRef<AudioTrack | null>(null);
  const playbackRateRef = useRef(1);
  const tentouFallbackRef = useRef(false);

  // GainNode for volume boost (0-2x)
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [gainReady, setGainReady] = useState(false);

  // @ts-ignore Convex TS2589
  const heartbeat = useMutation(api.gravacoes.escutas.heartbeat);

  const { inicio: inicioLocal, fim: fimLocal, temSegmento } = bordasLocais(track, duration);
  const segmentDuration = temSegmento ? fimLocal - inicioLocal : duration;
  const relativeTime = temSegmento ? currentTime - inicioLocal : currentTime;
  const maxVolume = gainReady ? 2 : 1;

  // Preferencia de velocidade e por aparelho — nao vai para o servidor.
  useEffect(() => {
    const salva = velocidadeSalva();
    playbackRateRef.current = salva;
    setPlaybackRateState(salva);
    if (audioRef.current) audioRef.current.playbackRate = salva;
  }, []);

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

  // --- Fila de progresso: o que nao subiu offline sobe quando a rede volta ---

  const enviarPendentes = useCallback(async () => {
    const pendentes = await lerHeartbeatsPendentes();
    for (const p of pendentes) {
      try {
        await heartbeat({
          gravacaoId: p.gravacaoId as Id<"gravacoes">,
          currentTime: p.currentTime,
          duration: p.duration,
        });
        await limparHeartbeat(p.gravacaoId);
      } catch {
        // Rede caiu de novo — tenta na proxima.
        break;
      }
    }
  }, [heartbeat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.onLine) void enviarPendentes();
    const aoVoltar = () => { void enviarPendentes(); };
    window.addEventListener("online", aoVoltar);
    return () => window.removeEventListener("online", aoVoltar);
  }, [enviarPendentes]);

  // --- Audio event handlers ---

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    const t = trackRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    audio.preservesPitch = true;
    audio.playbackRate = playbackRateRef.current;

    const offset = t?.srcOffset ?? 0;
    const resumeAbs = pendingResumeRef.current;
    const resume = resumeAbs != null ? resumeAbs - offset : null;
    const { inicio: segStart, temSegmento: hasSeg } = bordasLocais(t, audio.duration);
    const segEnd = t?.fimSermao != null ? (t.fimSermao as number) - offset : audio.duration;

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
    if (!audio) return;
    audio.preservesPitch = true;
    audio.playbackRate = playbackRateRef.current;
    if (!pendingPlayRef.current) return;
    pendingPlayRef.current = false;
    audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, []);

  // Audio offline que nao toca (blob corrompido, formato recusado pelo browser):
  // volta para o CDN e avisa quem guardou, para descartar o arquivo local.
  const handleError = useCallback(() => {
    const audio = audioRef.current;
    const t = trackRef.current;
    if (!audio || !t?.fallbackUrl || tentouFallbackRef.current) return;
    tentouFallbackRef.current = true;

    const emCdn: AudioTrack = {
      ...t,
      url: t.fallbackUrl,
      fallbackUrl: undefined,
      srcOffset: 0,
    };
    trackRef.current = emCdn;
    setTrack(emCdn);

    audio.crossOrigin = "anonymous";
    audio.src = toCdnUrl(emCdn.url);
    pendingPlayRef.current = true;
    audio.load();

    // So depois de trocar a fonte: descartar o arquivo local revoga o
    // object URL que estava no src.
    t.onErroFonte?.();
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    const t = trackRef.current;
    if (!audio) return;

    const offset = t?.srcOffset ?? 0;
    const { inicio: segStart, temSegmento: hasSegs } = bordasLocais(t, audio.duration);
    const dur = audio.duration;

    // Skip boundary checks if duration not yet available
    if (!dur || !isFinite(dur)) {
      setCurrentTime(audio.currentTime);
      return;
    }

    const segEnd = t?.fimSermao != null ? (t.fimSermao as number) - offset : dur;

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

    // Heartbeat — sempre em segundos do culto completo, mesmo com fonte parcial.
    if (t?.gravacaoId) {
      const now = Date.now();
      if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL) {
        lastHeartbeatRef.current = now;
        const segundoAbsoluto = Math.round(audio.currentTime + offset);
        const duracaoAbsoluta = Math.round(t.duracaoTotal ?? audio.duration + offset);
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          void enfileirarHeartbeat({
            gravacaoId: t.gravacaoId,
            currentTime: segundoAbsoluto,
            duration: duracaoAbsoluta,
            registradoEm: now,
          });
        } else {
          heartbeat({
            gravacaoId: t.gravacaoId,
            currentTime: segundoAbsoluto,
            duration: duracaoAbsoluta,
          }).catch(() => {
            void enfileirarHeartbeat({
              gravacaoId: t.gravacaoId!,
              currentTime: segundoAbsoluto,
              duration: duracaoAbsoluta,
              registradoEm: now,
            });
          });
        }
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
    tentouFallbackRef.current = false;
    trackRef.current = newTrack;
    setTrack(newTrack);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);

    // Fonte offline e um object URL local: same-origin, nao passa pelo CDN.
    // O crossOrigin nao e alterado — o elemento pode estar ligado ao
    // AudioContext (GainNode) e trocar o atributo em uso quebra o audio.
    const ehLocal = newTrack.url.startsWith("blob:");
    if (!ehLocal) audio.crossOrigin = "anonymous";
    audio.src = ehLocal ? newTrack.url : toCdnUrl(newTrack.url);
    audio.preservesPitch = true;
    audio.playbackRate = playbackRateRef.current;
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
      const { inicio: segStart, fim: segEnd, temSegmento: hasSegs } = bordasLocais(track, audio.duration);
      if (hasSegs && audio.currentTime >= segEnd) {
        audio.currentTime = segStart;
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
    const { inicio: segStart, temSegmento: hasSegs } = bordasLocais(track, audio.duration);
    const absolute = hasSegs ? segStart + relativeSeconds : relativeSeconds;
    audio.currentTime = absolute;
    setCurrentTime(absolute);
  }, [track]);

  const seekRelative = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const { inicio: segStart, fim: segEnd } = bordasLocais(track, audio.duration);
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

  const setPlaybackRate = useCallback((r: number) => {
    const clamped = Math.max(0.5, Math.min(3, r));
    playbackRateRef.current = clamped;
    setPlaybackRateState(clamped);
    const audio = audioRef.current;
    if (audio) {
      // Mantem o tom da voz ao acelerar (padrao, mas explicito por causa do Safari).
      audio.preservesPitch = true;
      audio.playbackRate = clamped;
    }
    try {
      window.localStorage.setItem(STORAGE_VELOCIDADE, String(clamped));
    } catch {
      // Storage indisponivel — velocidade vale so nesta sessao.
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
    playbackRate,
    play,
    pause,
    resume,
    togglePlayPause,
    seek,
    seekRelative,
    setVolume,
    setPlaybackRate,
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
        onError={handleError}
        style={{ display: "none" }}
      />
    </AudioPlayerContext.Provider>
  );
}
