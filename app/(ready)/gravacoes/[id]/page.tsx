"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Reacoes } from "@features/gravacoes/components/Reacoes";
import { ComentarioInput, ComentariosList } from "@features/gravacoes/components/Comentarios";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/shared/components/ui/empty";
import Link from "next/link";
import { Play, Pause, FileQuestion } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEscutaTracker } from "@features/gravacoes/hooks/useEscutaTracker";
import { useState } from "react";
import { cn } from "@shared/lib/utils/cn";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";

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
    return (
      <Empty className="min-h-[60vh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>Gravação não encontrada</EmptyTitle>
          <EmptyDescription>
            Ela pode ter sido removida ou o link está incorreto.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/gravacoes">Voltar para gravações</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
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
    <HeaderLayout>
    <div className="-m-4 md:-m-6">
      <div className="px-4 md:px-6">
        <div className="max-w-2xl mx-auto py-4 md:py-6 space-y-5">
          <DetailHeader backHref="/gravacoes" />

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
              className="flex items-center gap-3 active:opacity-80 transition-opacity"
            >
              <div
                className={cn(
                  "shrink-0 h-12 w-12 rounded-full flex items-center justify-center transition-colors",
                  isThisPlaying
                    ? "bg-primary/10"
                    : "bg-primary",
                )}
              >
                {isThisPlaying
                  ? <Pause className="h-5 w-5 text-primary" fill="currentColor" strokeWidth={0} />
                  : <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" strokeWidth={0} />
                }
              </div>
              <span className={cn(
                "text-sm font-medium",
                isThisPlaying ? "text-primary" : "text-foreground",
              )}>
                {isThisPlaying ? "Pausar" : "Ouvir"}
              </span>
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

            <div className="mb-4">
              <ComentarioInput
                gravacaoId={gravacao._id}
                onCreated={(commentId) => {
                  setHighlightId(commentId);
                  setTimeout(() => setHighlightId(null), 2000);
                }}
              />
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
    </div>
    </HeaderLayout>
  );
}
