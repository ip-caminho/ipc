"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Slider } from "@/shared/components/ui/slider";
import { Megaphone, Play, Pause, Volume2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

const CDN_BASE = "https://cdn.yhc.com.br";
function toCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE)) return url;
  const match = url.match(/\/file\/[^/]+\/(.+)/);
  if (match) return `${CDN_BASE}/${match[1]}`;
  return url;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MiniPlayer({ url, inicio, fim }: { url: string; inicio: number; fim?: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [boostReady, setBoostReady] = useState(false);
  const [vol, setVol] = useState(1);
  const [showVol, setShowVol] = useState(false);
  const duration = (fim ?? 0) - inicio;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = inicio;
  }, [inicio]);

  const initGain = useCallback(() => {
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
      setBoostReady(true);
    } catch { /* no CORS — native volume only */ }
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    initGain();
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    if (audio.paused) {
      const end = fim ?? audio.duration;
      if (audio.currentTime >= end) audio.currentTime = inicio;
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [inicio, fim, initGain]);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const end = fim ?? audio.duration;
    if (audio.currentTime >= end) {
      audio.pause();
      audio.currentTime = end;
      setPlaying(false);
    }
    setTime(audio.currentTime - inicio);
  }, [inicio, fim]);

  const handleVol = useCallback(([v]: number[]) => {
    setVol(v);
    if (gainRef.current) {
      gainRef.current.gain.value = v;
      if (audioRef.current) audioRef.current.volume = 1;
    } else if (audioRef.current) {
      audioRef.current.volume = Math.min(v, 1);
    }
  }, []);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={toCdnUrl(url)}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 text-xs font-medium transition-colors"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {playing ? formatTime(Math.max(0, time)) : "Clique aqui para ouvir"}
      </button>
      <button
        type="button"
        onClick={() => setShowVol(!showVol)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Volume"
      >
        <Volume2 className="h-3.5 w-3.5" />
      </button>
      {showVol && (
        <div className="flex items-center gap-1.5">
          <Slider
            min={0}
            max={boostReady ? 2 : 1}
            step={0.05}
            value={[vol]}
            onValueChange={handleVol}
            className="w-16 cursor-pointer"
          />
          {vol > 1 && (
            <span className="text-[10px] text-primary font-medium tabular-nums">
              {Math.round(vol * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function AvisosWidget() {
  // @ts-ignore Convex TS2589
  const data = useQuery(api.gravacoes.queries.getLatestAvisos);

  if (data === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Avisos da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Avisos da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum aviso recente</p>
        </CardContent>
      </Card>
    );
  }

  const { avisos, audioUrl, inicioAvisos, fimAvisos, data: dataGravacao, gravacaoId } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Avisos da semana
            </CardTitle>
            {audioUrl && inicioAvisos != null && (
              <MiniPlayer url={audioUrl} inicio={inicioAvisos} fim={fimAvisos} />
            )}
          </div>
          <Link
            href={`/gravacoes/${gravacaoId}`}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {format(parseISO(dataGravacao), "dd/MM/yyyy", { locale: ptBR })}
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {avisos.map((aviso: { titulo: string; descricao: string }, i: number) => (
            <li key={i} className="space-y-0.5">
              <p className="text-sm font-medium">{aviso.titulo}</p>
              <p className="text-sm text-muted-foreground">{aviso.descricao}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
