"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Megaphone, Play, Pause, Headphones, Calendar, MapPin, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface AvisosWidgetProps {
  variant?: "card" | "drawer";
}

export function AvisosWidget({ variant = "card" }: AvisosWidgetProps) {
  // @ts-ignore Convex TS2589
  const data = useQuery(api.gravacoes.queries.getLatestAvisos);
  const player = useAudioPlayer();

  if (data === undefined) {
    if (variant === "drawer") {
      return <p className="text-sm text-muted-foreground py-4">Carregando...</p>;
    }
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
    if (variant === "drawer") {
      return <p className="text-sm text-muted-foreground py-4">Nenhum aviso recente</p>;
    }
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
        title: `Avisos do dia ${format(parseISO(dataGravacao), "dd/MM")}`,
        gravacaoId,
        inicioSermao: inicioAvisos,
        fimSermao: fimAvisos,
      });
    }
  };

  const dataFormatada = format(parseISO(dataGravacao), "dd/MM");

  // Drawer variant — botão fixo, lista com fade e scroll
  if (variant === "drawer") {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Botão ouvir — fixo no topo */}
        {audioUrl && inicioAvisos != null && (
          <div className="pb-3 shrink-0">
            <button
              type="button"
              onClick={handlePlay}
              className={`w-full flex items-center justify-center gap-2.5 h-12 rounded-xl text-base font-medium transition-all min-h-[48px] ${
                isThisPlaying
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              <Headphones className="h-4.5 w-4.5" />
              {isThisPlaying ? "Pausar avisos" : "Ouvir avisos"}
              {isThisPlaying
                ? <Pause size={16} fill="currentColor" strokeWidth={0} />
                : <Play size={16} fill="currentColor" strokeWidth={0} />
              }
            </button>
          </div>
        )}

        {/* Lista de avisos com fade e scroll próprio */}
        <div className="relative flex-1 min-h-0">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 bg-gradient-to-b from-background to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 bg-gradient-to-t from-background to-transparent" />
          <div className="flex flex-col gap-2 py-6 overflow-y-auto h-full">
            {avisos.map((aviso: any, i: number) => (
              <div key={i} className="bg-muted rounded-lg px-3 py-2.5 space-y-1">
                <p className="text-sm font-medium text-foreground">{aviso.titulo}</p>
                <p className="text-sm text-muted-foreground">{aviso.descricao}</p>
                {(aviso.quando || aviso.onde || aviso.contatoNome) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                    {aviso.quando && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />{aviso.quando}
                      </span>
                    )}
                    {aviso.onde && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{aviso.onde}
                      </span>
                    )}
                    {aviso.contatoNome && (
                      aviso.contatoWhatsapp ? (
                        <a
                          href={`https://wa.me/55${aviso.contatoWhatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                        >
                          <MessageCircle className="h-3 w-3" />Falar com {aviso.contatoNome}
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />Falar com {aviso.contatoNome}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Card variant — padrão (desktop)
  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone size={13} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Avisos do dia {dataFormatada}
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
        {avisos.map((aviso: any, i: number) => (
          <div key={i} className="bg-muted rounded-lg px-3 py-2 space-y-0.5">
            <p className="text-xs font-medium text-foreground">{aviso.titulo}</p>
            <p className="text-xs text-muted-foreground">{aviso.descricao}</p>
            {(aviso.quando || aviso.onde) && (
              <p className="text-[10px] text-muted-foreground">
                {[aviso.quando, aviso.onde].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
