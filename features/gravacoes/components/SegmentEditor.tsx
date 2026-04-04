"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Slider } from "@/shared/components/ui/slider";
import { Play, Pause, Save, Scissors, RotateCcw, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { useWaveformPeaks } from "../hooks/useWaveformPeaks";
import { WaveformCanvas, type WaveformRegion } from "./WaveformCanvas";

interface SegmentEditorProps {
  gravacaoId: Id<"gravacoes">;
  audioUrl: string;
  inicioSermao?: number | null;
  fimSermao?: number | null;
  inicioAvisos?: number | null;
  fimAvisos?: number | null;
}

const CDN_BASE = "https://cdn.yhc.com.br";
function toCdnUrl(url: string): string {
  if (url.startsWith(CDN_BASE)) return url;
  const match = url.match(/\/file\/[^/]+\/(.+)/);
  if (match) return `${CDN_BASE}/${match[1]}`;
  return url;
}

function secondsToHHMMSS(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function hhmmssToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num;
  return null;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SegmentEditor({
  gravacaoId,
  audioUrl,
  inicioSermao,
  fimSermao,
  inicioAvisos,
  fimAvisos,
}: SegmentEditorProps) {
  const updateGravacao = useMutation(api.gravacoes.mutations.update);
  const globalPlayer = useAudioPlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [iSermao, setISermao] = useState(secondsToHHMMSS(inicioSermao));
  const [fSermao, setFSermao] = useState(secondsToHHMMSS(fimSermao));
  const [iAvisos, setIAvisos] = useState(secondsToHHMMSS(inicioAvisos));
  const [fAvisos, setFAvisos] = useState(secondsToHHMMSS(fimAvisos));
  const [saving, setSaving] = useState(false);
  const cdnUrl = toCdnUrl(audioUrl);
  const { peaks, loading: waveformLoading, progress: waveformProgress, error: waveformError } = useWaveformPeaks(cdnUrl);

  const regions = useMemo<WaveformRegion[]>(() => {
    const r: WaveformRegion[] = [];
    const is = hhmmssToSeconds(iSermao);
    const fs = hhmmssToSeconds(fSermao);
    const ia = hhmmssToSeconds(iAvisos);
    const fa = hhmmssToSeconds(fAvisos);
    if (is != null && fs != null) {
      r.push({ start: is, end: fs, color: "hsla(210, 80%, 55%, 0.15)", label: "Sermao" });
    }
    if (ia != null && fa != null) {
      r.push({ start: ia, end: fa, color: "hsla(40, 90%, 55%, 0.2)", label: "Avisos" });
    }
    return r;
  }, [iSermao, fSermao, iAvisos, fAvisos]);

  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toca um preview de ~5 segundos a partir de um ponto
  const playPreview = useCallback((startSec: number, label: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    globalPlayer.pause();
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    audio.currentTime = startSec;
    audio.play();
    setPlaying(true);
    setPreviewLabel(label);

    previewTimeoutRef.current = setTimeout(() => {
      audio.pause();
      setPlaying(false);
      setPreviewLabel(null);
    }, 5000);
  }, [globalPlayer]);

  // Para o preview se estiver rodando
  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setPreviewLabel(null);
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      globalPlayer.pause();
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [globalPlayer]);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleSlider = useCallback(([v]: number[]) => {
    handleSeek(v);
  }, [handleSeek]);

  const captureTime = useCallback((setter: (v: string) => void) => {
    setter(secondsToHHMMSS(currentTime));
  }, [currentTime]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGravacao({
        id: gravacaoId,
        data: {
          inicioSermao: hhmmssToSeconds(iSermao) ?? undefined,
          fimSermao: hhmmssToSeconds(fSermao) ?? undefined,
          inicioAvisos: hhmmssToSeconds(iAvisos) ?? undefined,
          fimAvisos: hhmmssToSeconds(fAvisos) ?? undefined,
        },
      });
      toast.success("Timestamps atualizados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          Ajustar trechos do audio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio player com waveform */}
        <div className="space-y-2 p-3 bg-muted rounded-md">
          <audio
            ref={audioRef}
            src={cdnUrl}
            preload="metadata"
            onLoadedMetadata={() => {
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onEnded={() => setPlaying(false)}
          />

          {/* Waveform ou fallback slider */}
          {waveformLoading ? (
            <div className="flex flex-col items-center justify-center h-24 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando forma de onda... {waveformProgress > 0 ? `${waveformProgress}%` : ""}</span>
              {waveformProgress > 0 && (
                <div className="w-48 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${waveformProgress}%` }} />
                </div>
              )}
            </div>
          ) : peaks ? (
            <WaveformCanvas
              peaks={peaks}
              duration={duration}
              currentTime={currentTime}
              regions={regions}
              onSeek={handleSeek}
              className="h-24 rounded"
            />
          ) : (
            <div className="space-y-2">
              {waveformError && (
                <p className="text-[10px] text-muted-foreground">Waveform indisponivel: {waveformError}</p>
              )}
              <Slider
                min={0}
                max={duration || 1}
                step={0.5}
                value={[currentTime]}
                onValueChange={handleSlider}
              />
            </div>
          )}

          {/* Controles */}
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
            <div className="flex-1 text-[10px] text-muted-foreground">
              Clique na forma de onda para navegar
            </div>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Legenda das regioes */}
          {regions.length > 0 && (
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsla(210, 80%, 55%, 0.3)" }} />
                Sermao
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsla(40, 90%, 55%, 0.4)" }} />
                Avisos
              </span>
            </div>
          )}
        </div>

        {/* Preview indicator */}
        {previewLabel && (
          <div className="flex items-center justify-between p-2 bg-primary/10 rounded-md text-sm">
            <span className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 animate-pulse" />
              Ouvindo: {previewLabel}
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={stopPreview}>
              Parar
            </Button>
          </div>
        )}

        {/* Sermao */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sermao</span>
            {hhmmssToSeconds(iSermao) != null && hhmmssToSeconds(fSermao) != null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => playPreview(hhmmssToSeconds(iSermao)!, "Sermao (inicio)")}
              >
                <Play className="h-3 w-3" /> Ouvir trecho
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Inicio</Label>
              <div className="flex gap-1.5">
                <Input
                  value={iSermao}
                  onChange={(e) => setISermao(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Usar posicao atual"
                  onClick={() => captureTime(setISermao)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                {hhmmssToSeconds(iSermao) != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    title="Ouvir 5s a partir deste ponto"
                    onClick={() => playPreview(hhmmssToSeconds(iSermao)!, "Inicio sermao")}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fim</Label>
              <div className="flex gap-1.5">
                <Input
                  value={fSermao}
                  onChange={(e) => setFSermao(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Usar posicao atual"
                  onClick={() => captureTime(setFSermao)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                {hhmmssToSeconds(fSermao) != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    title="Ouvir 5s antes deste ponto"
                    onClick={() => playPreview(Math.max(0, hhmmssToSeconds(fSermao)! - 5), "Fim sermao")}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Avisos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Avisos</span>
            {hhmmssToSeconds(iAvisos) != null && hhmmssToSeconds(fAvisos) != null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => playPreview(hhmmssToSeconds(iAvisos)!, "Avisos (inicio)")}
              >
                <Play className="h-3 w-3" /> Ouvir trecho
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Inicio</Label>
              <div className="flex gap-1.5">
                <Input
                  value={iAvisos}
                  onChange={(e) => setIAvisos(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Usar posicao atual"
                  onClick={() => captureTime(setIAvisos)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                {hhmmssToSeconds(iAvisos) != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    title="Ouvir 5s a partir deste ponto"
                    onClick={() => playPreview(hhmmssToSeconds(iAvisos)!, "Inicio avisos")}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fim</Label>
              <div className="flex gap-1.5">
                <Input
                  value={fAvisos}
                  onChange={(e) => setFAvisos(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Usar posicao atual"
                  onClick={() => captureTime(setFAvisos)}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                {hhmmssToSeconds(fAvisos) != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    title="Ouvir 5s antes deste ponto"
                    onClick={() => playPreview(Math.max(0, hhmmssToSeconds(fAvisos)! - 5), "Fim avisos")}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Salvando..." : "Salvar timestamps"}
        </Button>
      </CardContent>
    </Card>
  );
}
