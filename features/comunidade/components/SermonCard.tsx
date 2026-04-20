"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSermonGradient } from "@features/comunidade/lib/sermonGradient";

export interface SermonCardData {
  _id: string;
  titulo: string;
  data: string;
  pregadorNome?: string | null;
  pregadorInfo?: { nome: string } | null;
  serieInfo?: { nome: string } | null;
  duracaoSegundos?: number | null;
}

function formatDurationShort(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem.toString().padStart(2, "0")}`;
}

export function SermonCard({ sermon }: { sermon: SermonCardData }) {
  const pregador = sermon.pregadorInfo?.nome || sermon.pregadorNome || null;
  const serie = sermon.serieInfo?.nome || null;
  const gradient = getSermonGradient(serie || sermon.titulo);
  const duracao = formatDurationShort(sermon.duracaoSegundos);

  let dataCurta: string | null = null;
  try {
    dataCurta = format(parseISO(sermon.data), "EEE, d MMM", { locale: ptBR });
  } catch {
    dataCurta = null;
  }

  return (
    <Link
      href={`/gravacoes/${sermon._id}`}
      className="shrink-0 w-[130px] active:opacity-80 transition-opacity"
    >
      <div
        className="relative h-[130px] w-[130px] rounded-md overflow-hidden flex items-center justify-center"
        style={{ background: gradient }}
      >
        <Play
          className="h-8 w-8 text-white/90"
          fill="currentColor"
          strokeWidth={0}
        />
        {duracao && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 text-white text-[9px] leading-none px-1.5 py-0.5">
            {duracao}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] font-medium leading-tight line-clamp-2">
        {sermon.titulo}
      </p>
      {pregador && (
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
          {pregador}
        </p>
      )}
      {dataCurta && (
        <p className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
          {dataCurta}
        </p>
      )}
    </Link>
  );
}
