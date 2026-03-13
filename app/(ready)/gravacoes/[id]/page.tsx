"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SecureAudioPlayer } from "@/shared/files/components/SecureAudioPlayer";
import { Reacoes } from "@features/gravacoes/components/Reacoes";
import { ComentarioInput, ComentariosList } from "@features/gravacoes/components/Comentarios";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEscutaTracker } from "@features/gravacoes/hooks/useEscutaTracker";
import { useState } from "react";

function ResumoCollapsible({ resumo }: { resumo: string }) {
  const [expanded, setExpanded] = useState(false);
  const MAX_CHARS = 200;
  const needsTruncation = resumo.length > MAX_CHARS;

  return (
    <div>
      <p className="text-xs font-medium mb-1">Resumo</p>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {needsTruncation && !expanded ? resumo.slice(0, MAX_CHARS) + "..." : resumo}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

export default function GravacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const gravacao = useQuery(api.gravacoes.queries.getById, { id: id as Id<"gravacoes"> });
  const { onTimeUpdate, ultimoSegundo } = useEscutaTracker(id as Id<"gravacoes">);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  if (gravacao === undefined) {
    return <Skeleton className="h-96 w-full max-w-2xl" />;
  }
  if (!gravacao) {
    return <p className="text-muted-foreground">Gravacao nao encontrada</p>;
  }

  return (
    <div className="flex flex-col -m-4 md:-m-6" style={{ height: "calc(100% + 2rem)", maxHeight: "calc(100% + 2rem)" }}>
      {/* Fixed top: titulo + player */}
      <div className="bg-background px-4 pb-4 pt-4 md:px-6 md:pt-6 shrink-0">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold">{gravacao.titulo}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(gravacao.pregadorNome || gravacao.pregadorInfo?.nome) && (
                <span>{gravacao.pregadorNome || gravacao.pregadorInfo?.nome}</span>
              )}
              <span>{format(parseISO(gravacao.data), "dd/MM/yyyy", { locale: ptBR })}</span>
              {gravacao.serieInfo && (
                <Badge variant="outline" className="text-xs">{gravacao.serieInfo.nome}</Badge>
              )}
            </div>
            {gravacao.textoBase && (
              <p className="text-sm text-muted-foreground">{gravacao.textoBase}</p>
            )}
          </div>

          {gravacao.audioUrl && gravacao.iaStatus === "CONCLUIDO" && (
            <SecureAudioPlayer
              url={gravacao.audioUrl}
              onTimeUpdate={onTimeUpdate}
              inicioSermao={gravacao.inicioSermao}
              fimSermao={gravacao.fimSermao}
              resumeFrom={ultimoSegundo}
            />
          )}
        </div>
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-4 py-4">
          {gravacao.resumo && (
            <ResumoCollapsible resumo={gravacao.resumo} />
          )}

          <Reacoes gravacaoId={gravacao._id} />

          <ComentariosList gravacaoId={gravacao._id} highlightId={highlightId} />
        </div>
      </div>

      {/* Fixed bottom: comment input */}
      <div className="bg-background px-4 pt-3 pb-4 md:px-6 md:pb-6 border-t shrink-0">
        <div className="max-w-2xl mx-auto">
          <ComentarioInput
            gravacaoId={gravacao._id}
            onCreated={(id) => {
              setHighlightId(id);
              setTimeout(() => setHighlightId(null), 2000);
            }}
          />
        </div>
      </div>
    </div>
  );
}
