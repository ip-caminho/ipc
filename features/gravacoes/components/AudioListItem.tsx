"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getTipoLabel } from "@features/gravacoes/lib/categoryGradient";

export interface AudioListItemData {
  _id: string;
  titulo: string;
  data: string;
  tipo: string;
  pregadorNome?: string | null;
  pregadorInfo?: { nome: string } | null;
  inicioConteudo?: number | null;
  fimConteudo?: number | null;
  inicioSermao?: number | null;
  fimSermao?: number | null;
}

function formatDurationFromBoundaries(
  inicio?: number | null,
  fim?: number | null,
): string | null {
  if (inicio == null || fim == null) return null;
  const diff = fim - inicio;
  if (diff <= 0) return null;
  const minutos = Math.round(diff / 60);
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const rem = minutos % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem.toString().padStart(2, "0")}`;
}

export function AudioListItem({ audio, hideType }: { audio: AudioListItemData; hideType?: boolean }) {
  const pregador = audio.pregadorInfo?.nome || audio.pregadorNome || null;
  const categoria = getTipoLabel(audio.tipo);
  const duracao = formatDurationFromBoundaries(
    audio.inicioConteudo ?? audio.inicioSermao,
    audio.fimConteudo ?? audio.fimSermao,
  );

  let dataCurta = "";
  try {
    dataCurta = format(parseISO(audio.data), "d MMM", { locale: ptBR }).replace(".", "");
  } catch {
    dataCurta = "";
  }

  const metaParts = [pregador, dataCurta, duracao].filter(Boolean);

  return (
    <Link
      href={`/gravacoes/${audio._id}`}
      className="flex items-center gap-3 py-1.5 active:opacity-80 transition-opacity"
    >
      <div className="shrink-0 h-9 w-9 rounded-full bg-muted flex items-center justify-center">
        <Play
          className="h-4 w-4 text-muted-foreground"
          fill="currentColor"
          strokeWidth={0}
        />
      </div>
      <div className="flex-1 min-w-0">
        {!hideType && (
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {categoria}
          </p>
        )}
        <p className={`text-sm font-medium leading-tight line-clamp-2 ${hideType ? "" : "mt-0.5"}`}>
          {audio.titulo}
        </p>
        {metaParts.length > 0 && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {metaParts.join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
