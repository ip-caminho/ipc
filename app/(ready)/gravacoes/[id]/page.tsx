"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Reacoes } from "@features/gravacoes/components/Reacoes";
import { ComentarioInput, ComentariosList } from "@features/gravacoes/components/Comentarios";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Headphones, Play, Pause } from "lucide-react";
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
  const comentarios = useQuery(api.gravacoes.comentarios.listByGravacao, { gravacaoId: id as Id<"gravacoes"> });
  const { ultimoSegundo } = useEscutaTracker(id as Id<"gravacoes">);
  const globalPlayer = useAudioPlayer();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [resumoExpanded, setResumoExpanded] = useState(false);

  if (gravacao === undefined) {
    return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  }
  if (!gravacao) {
    return <p className="text-muted-foreground text-center py-16">Gravação não encontrada</p>;
  }

  // Boundaries do conteudo: preferir inicio/fimConteudo (universal),
  // cair para inicio/fimSermao em registros legacy (SERMAO pre-migracao).
  const segInicio = gravacao.inicioConteudo ?? gravacao.inicioSermao ?? null;
  const segFim = gravacao.fimConteudo ?? gravacao.fimSermao ?? null;

  const isThisTrack = globalPlayer.track?.gravacaoId === gravacao._id
    && globalPlayer.track?.inicioSermao === segInicio
    && globalPlayer.track?.fimSermao === segFim;
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
        inicioSermao: segInicio,
        fimSermao: segFim,
        resumeFrom: ultimoSegundo,
      });
    }
  };

  const pregador = gravacao.pregadorNome || gravacao.pregadorInfo?.nome;
  const dataFormatada = format(parseISO(gravacao.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const comentarioCount = comentarios?.filter((c: any) => !c.parentId).length ?? 0;
  const hasAudio = gravacao.audioUrl && gravacao.iaStatus === "CONCLUIDO";

  return (
    <div className="-m-4 md:-m-6 flex flex-col">
      {/* Conteúdo principal — scroll do documento */}
      <div className="flex-1 px-4 md:px-6">
        <div className="max-w-2xl mx-auto py-4 md:py-6 space-y-5">

          {/* 1. Título + metadados */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-snug text-foreground">
              {gravacao.titulo}
            </h1>
            {pregador && (
              <p className="text-base text-foreground/80 mt-1">{pregador}</p>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              {dataFormatada}
              {gravacao.textoBase && <> · {gravacao.textoBase}</>}
            </p>
          </div>

          {/* 2. Descrição */}
          {gravacao.resumo && (
            <div>
              <div className="relative">
                <p className={cn(
                  "text-base md:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
                  !resumoExpanded && "line-clamp-4",
                )}>
                  {gravacao.resumo}
                </p>
                {!resumoExpanded && gravacao.resumo.length > 300 && (
                  <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              {gravacao.resumo.length > 300 && (
                <button
                  onClick={() => setResumoExpanded(!resumoExpanded)}
                  className="text-sm text-muted-foreground underline underline-offset-2 mt-1.5 hover:text-foreground transition-colors min-h-[44px]"
                >
                  {resumoExpanded ? "Ver menos" : "Ver mais"}
                </button>
              )}
            </div>
          )}

          {/* Botão de áudio */}
          {hasAudio && (
            <button
              onClick={handlePlay}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 h-12 rounded-xl text-base font-medium transition-all min-h-[48px]",
                isThisPlaying
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                  : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500",
              )}
            >
              <Headphones className="h-4.5 w-4.5" />
              {isThisPlaying ? "Pausar pregação" : "Ouvir pregação"}
              {isThisPlaying
                ? <Pause size={16} fill="currentColor" strokeWidth={0} />
                : <Play size={16} fill="currentColor" strokeWidth={0} />
              }
            </button>
          )}

          {/* 5. Reações */}
          <Reacoes gravacaoId={gravacao._id} />

          {/* 6. Comentários */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                Comentários {comentarioCount > 0 && `(${comentarioCount})`}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {comentarioCount === 0 && comentarios !== undefined ? (
              <p className="text-sm text-muted-foreground/60 text-center py-6">
                Nenhum comentário ainda. Seja o primeiro.
              </p>
            ) : (
              <ComentariosList gravacaoId={gravacao._id} highlightId={highlightId} />
            )}
          </div>
        </div>
      </div>

      {/* Input de comentário no final do fluxo */}
      <div className="bg-background px-4 pt-3 pb-4 md:px-6 md:pb-6 border-t">
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
