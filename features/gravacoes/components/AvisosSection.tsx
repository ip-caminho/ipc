"use client";

import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Megaphone, Play, Pause } from "lucide-react";

interface Aviso {
  titulo: string;
  descricao: string;
}

interface AvisosSectionProps {
  audioUrl: string;
  inicioAvisos?: number | null;
  fimAvisos?: number | null;
  avisos?: Aviso[] | null;
}

export function AvisosSection({
  audioUrl,
  inicioAvisos,
  fimAvisos,
  avisos,
}: AvisosSectionProps) {
  const player = useAudioPlayer();

  if (!avisos || avisos.length === 0) return null;

  const isThisTrack = player.track?.url === audioUrl
    && player.track?.inicioSermao === inicioAvisos
    && player.track?.fimSermao === fimAvisos;
  const isThisPlaying = isThisTrack && player.isPlaying;

  const handlePlay = () => {
    if (isThisPlaying) {
      player.pause();
    } else if (isThisTrack) {
      player.resume();
    } else {
      player.play({
        url: audioUrl,
        title: "Avisos do culto",
        inicioSermao: inicioAvisos,
        fimSermao: fimAvisos,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Avisos do culto
          </CardTitle>
          {inicioAvisos != null && (
            <Button variant="outline" size="sm" onClick={handlePlay}>
              {isThisPlaying ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {isThisPlaying ? "Pausar" : "Ouvir avisos"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {avisos.map((aviso, i) => (
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
