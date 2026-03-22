"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Megaphone, Play, Pause } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

export function AvisosWidget() {
  // @ts-ignore Convex TS2589
  const data = useQuery(api.gravacoes.queries.getLatestAvisos);
  const player = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);

  if (data === undefined) {
    return (
      <div className="bg-background border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={13} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Avisos</span>
        </div>
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-background border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={13} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Avisos</span>
        </div>
        <p className="text-xs text-muted-foreground">Nenhum aviso recente</p>
      </div>
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

  const avisosVisiveis = expanded ? avisos : avisos.slice(0, 2);
  const temMais = avisos.length > 2 && !expanded;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone size={13} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Avisos do dia {format(parseISO(dataGravacao), "dd/MM")}
          </span>
        </div>
        {audioUrl && inicioAvisos != null && (
          <button
            type="button"
            onClick={handlePlay}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            {isThisPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isThisPlaying ? "Pausar" : "Ouvir"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {avisosVisiveis.map((aviso: { titulo: string; descricao: string }, i: number) => (
          <div key={i} className="bg-muted rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-foreground mb-0.5">{aviso.titulo}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{aviso.descricao}</p>
          </div>
        ))}
        {temMais && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-muted-foreground underline underline-offset-2 text-left mt-1 transition-colors duration-150 hover:text-foreground"
          >
            +{avisos.length - 2} avisos
          </button>
        )}
      </div>
    </div>
  );
}
