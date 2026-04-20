"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface EventCardData {
  _id: string;
  titulo: string;
  data: string;
  ministerioNome?: string | null;
}

export function EventCard({ evento }: { evento: EventCardData }) {
  let dataLabel = "";
  try {
    dataLabel = format(parseISO(evento.data), "EEE d MMM", { locale: ptBR }).toUpperCase();
  } catch {
    dataLabel = evento.data;
  }

  return (
    <Link
      href="/calendario"
      className="shrink-0 w-[130px] rounded-md border p-2.5 active:opacity-80 transition-opacity"
    >
      <p className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
        {dataLabel}
      </p>
      <p className="text-xs font-medium leading-tight line-clamp-2 mt-1">
        {evento.titulo}
      </p>
      {evento.ministerioNome && (
        <p className="text-[10px] text-muted-foreground truncate mt-1">
          {evento.ministerioNome}
        </p>
      )}
    </Link>
  );
}
