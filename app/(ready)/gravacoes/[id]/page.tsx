"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Reacoes } from "@features/gravacoes/components/Reacoes";
import { ComentarioInput, ComentariosList } from "@features/gravacoes/components/Comentarios";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Play, Pause } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEscutaTracker } from "@features/gravacoes/hooks/useEscutaTracker";
import { useState } from "react";
import { cn } from "@shared/lib/utils/cn";

export default function GravacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  // @ts-ignore Convex TS2589
  const gravacao = useQuery(api.gravacoes.queries.getById, { id: id as Id<"gravacoes"> });
  const { ultimoSegundo } = useEscutaTracker(id as Id<"gravacoes">);
  const globalPlayer = useAudioPlayer();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [resumoExpanded, setResumoExpanded] = useState(false);

  if (gravacao === undefined) {
    return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  }
  if (!gravacao) {
    return <p className="text-muted-foreground text-center py-16">Gravacao nao encontrada</p>;
  }

  const isThisTrack = globalPlayer.track?.gravacaoId === gravacao._id
    && globalPlayer.track?.inicioSermao === gravacao.inicioSermao
    && globalPlayer.track?.fimSermao === gravacao.fimSermao;
  const isThisPlaying = isThisTrack && globalPlayer.isPlaying;

  const handlePlay = () => {
    if (isThisPlaying) {
      globalPlayer.pause();
    } else if (isThisTrack) {
      globalPlayer.resume();
    } else {
      globalPlayer.play({
        url: gravacao.audioUrl!,
        title: gravacao.titulo,
        artist: gravacao.pregadorNome || gravacao.pregadorInfo?.nome || undefined,
        gravacaoId: gravacao._id,
        inicioSermao: gravacao.inicioSermao,
        fimSermao: gravacao.fimSermao,
        resumeFrom: ultimoSegundo,
      });
    }
  };

  const pregador = gravacao.pregadorNome || gravacao.pregadorInfo?.nome;
  const dataFormatada = format(parseISO(gravacao.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex flex-col -m-4 md:-m-6" style={{ height: "calc(100% + 2rem)", maxHeight: "calc(100% + 2rem)" }}>
      {/* Fixed top */}
      <div className="bg-background px-4 pb-5 pt-4 md:px-6 md:pt-6 shrink-0">
        <div className="max-w-2xl mx-auto">
          {/* Badge passagem */}
          {gravacao.textoBase && (
            <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-muted text-foreground font-medium mb-3">
              {gravacao.textoBase}
            </span>
          )}

          {/* Titulo */}
          <h1 className="text-2xl font-medium leading-snug text-foreground mb-2">
            {gravacao.titulo}
          </h1>

          {/* Metadados */}
          <p className="text-sm text-muted-foreground">
            {pregador && <>{pregador} · </>}
            {dataFormatada}
          </p>

          {/* Botao ouvir */}
          {gravacao.audioUrl && gravacao.iaStatus === "CONCLUIDO" && (
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
            >
              {isThisPlaying
                ? <Pause size={14} fill="currentColor" strokeWidth={0} />
                : <Play size={14} fill="currentColor" strokeWidth={0} />
              }
              {isThisPlaying ? "Pausar sermao" : "Ouvir sermao"}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto py-4">
          {/* Resumo */}
          {gravacao.resumo && (
            <div className="mt-2">
              <p className={cn(
                "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
                !resumoExpanded && "line-clamp-4",
              )}>
                {gravacao.resumo}
              </p>
              {gravacao.resumo.length > 300 && (
                <button
                  onClick={() => setResumoExpanded(!resumoExpanded)}
                  className="text-xs text-muted-foreground underline underline-offset-2 mt-1 hover:text-foreground transition-colors duration-150"
                >
                  {resumoExpanded ? "Ver menos" : "Ver mais"}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {gravacao.tags && gravacao.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {gravacao.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Reacoes */}
          <div className="mt-6">
            <Reacoes gravacaoId={gravacao._id} />
          </div>

          {/* Comentarios header */}
          <div className="flex items-center gap-3 mt-8 mb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              Comentarios
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <ComentariosList gravacaoId={gravacao._id} highlightId={highlightId} />
        </div>
      </div>

      {/* Fixed bottom: comment input */}
      <div className="bg-background px-4 pt-3 pb-4 md:px-6 md:pb-6 border-t shrink-0">
        <div className="max-w-2xl mx-auto">
          <ComentarioInput
            gravacaoId={gravacao._id}
            onCreated={(commentId) => {
              setHighlightId(commentId);
              setTimeout(() => setHighlightId(null), 2000);
            }}
          />
        </div>
      </div>
    </div>
  );
}
