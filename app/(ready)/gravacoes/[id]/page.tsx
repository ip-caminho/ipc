"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Reacoes } from "@features/gravacoes/components/Reacoes";
import { ComentarioInput, ComentariosList } from "@features/gravacoes/components/Comentarios";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Headphones, Play, Pause, MessageCircle, Download } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEscutaTracker } from "@features/gravacoes/hooks/useEscutaTracker";
import { useState } from "react";
import { cn } from "@shared/lib/utils/cn";

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length - 44, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return out;
}

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
  const [downloading, setDownloading] = useState(false);

  if (gravacao === undefined) {
    return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  }
  if (!gravacao) {
    return <p className="text-muted-foreground text-center py-16">Gravação não encontrada</p>;
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

  const handleDownloadSermao = async () => {
    if (!gravacao.audioUrl || gravacao.inicioSermao == null) return;
    setDownloading(true);
    try {
      // Baixar áudio
      const response = await fetch(gravacao.audioUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Decodificar
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const start = gravacao.inicioSermao;
      const end = gravacao.fimSermao ?? audioBuffer.duration;
      const duration = end - start;
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(start * sampleRate);
      const endSample = Math.floor(end * sampleRate);
      const length = endSample - startSample;

      // Criar buffer do trecho
      const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, length, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0, start, duration);
      const renderedBuffer = await offlineCtx.startRendering();

      // Converter pra WAV
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: "audio/wav" });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${gravacao.titulo.replace(/[^a-zA-Z0-9\s]/g, "").trim()}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      await audioCtx.close();
    } catch {
      // silencioso
    } finally {
      setDownloading(false);
    }
  };

  const pregador = gravacao.pregadorNome || gravacao.pregadorInfo?.nome;
  const dataFormatada = format(parseISO(gravacao.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const comentarioCount = comentarios?.filter((c: any) => !c.parentId).length ?? 0;
  const hasAudio = gravacao.audioUrl && gravacao.iaStatus === "CONCLUIDO";

  return (
    <div className="flex flex-col -m-4 md:-m-6" style={{ height: "calc(100% + 2rem)", maxHeight: "calc(100% + 2rem)" }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-4 md:px-6">
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

          {/* Botão download sermão */}
          {hasAudio && gravacao.tipo === "SERMAO" && gravacao.inicioSermao != null && (
            <button
              onClick={handleDownloadSermao}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Preparando download..." : "Baixar audio do sermao"}
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

      {/* Fixed bottom: comment input */}
      <div className={cn(
        "bg-background px-4 pt-3 pb-4 md:px-6 md:pb-6 border-t shrink-0",
        globalPlayer.isActive && "pb-16 md:pb-6",
      )}>
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
