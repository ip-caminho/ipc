"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Megaphone, Play, Pause } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export function AvisosWidget() {
  // @ts-ignore Convex TS2589
  const data = useQuery(api.gravacoes.queries.getLatestAvisos);
  const player = useAudioPlayer();

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

  const isThisTrack = player.track?.gravacaoId === gravacaoId
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
        url: audioUrl!,
        title: "Avisos do culto",
        gravacaoId,
        inicioSermao: inicioAvisos,
        fimSermao: fimAvisos,
      });
    }
  };

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
              <button
                type="button"
                onClick={handlePlay}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 text-xs font-medium transition-colors"
              >
                {isThisPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isThisPlaying ? "Pausar" : "Ouvir avisos"}
              </button>
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
