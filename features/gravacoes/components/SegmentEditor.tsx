"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Slider } from "@/shared/components/ui/slider";
import { Play, Pause, Save, Scissors, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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

function secondsToMMSS(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mmssToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  // Try plain number (seconds)
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num;
  return null;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [iSermao, setISermao] = useState(secondsToMMSS(inicioSermao));
  const [fSermao, setFSermao] = useState(secondsToMMSS(fimSermao));
  const [iAvisos, setIAvisos] = useState(secondsToMMSS(inicioAvisos));
  const [fAvisos, setFAvisos] = useState(secondsToMMSS(fimAvisos));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  const handleSlider = useCallback(([v]: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = v;
    setCurrentTime(v);
  }, []);

  const captureTime = useCallback((setter: (v: string) => void) => {
    setter(secondsToMMSS(currentTime));
  }, [currentTime]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGravacao({
        id: gravacaoId,
        data: {
          inicioSermao: mmssToSeconds(iSermao) ?? undefined,
          fimSermao: mmssToSeconds(fSermao) ?? undefined,
          inicioAvisos: mmssToSeconds(iAvisos) ?? undefined,
          fimAvisos: mmssToSeconds(fAvisos) ?? undefined,
        },
      });
      toast.success("Timestamps atualizados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setOpen(true)}
      >
        <Scissors className="h-3 w-3" />
        Ajustar trechos
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Ajustar trechos do audio
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Full audio player for reference */}
        <div className="space-y-2 p-3 bg-muted rounded-md">
          <audio
            ref={audioRef}
            src={toCdnUrl(audioUrl)}
            preload="metadata"
            onLoadedMetadata={() => {
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onEnded={() => setPlaying(false)}
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
            <div className="flex-1">
              <Slider
                min={0}
                max={duration || 1}
                step={0.5}
                value={[currentTime]}
                onValueChange={handleSlider}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Audio completo — use para encontrar os pontos corretos
          </p>
        </div>

        {/* Timestamp fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Inicio do sermao</Label>
            <div className="flex gap-1.5">
              <Input
                value={iSermao}
                onChange={(e) => setISermao(e.target.value)}
                placeholder="MM:SS"
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Fim do sermao</Label>
            <div className="flex gap-1.5">
              <Input
                value={fSermao}
                onChange={(e) => setFSermao(e.target.value)}
                placeholder="MM:SS"
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Inicio dos avisos</Label>
            <div className="flex gap-1.5">
              <Input
                value={iAvisos}
                onChange={(e) => setIAvisos(e.target.value)}
                placeholder="MM:SS"
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Fim dos avisos</Label>
            <div className="flex gap-1.5">
              <Input
                value={fAvisos}
                onChange={(e) => setFAvisos(e.target.value)}
                placeholder="MM:SS"
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
