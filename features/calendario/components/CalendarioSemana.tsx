"use client";

import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { getFeriado } from "../lib/feriados";
import { TIPO_EVENTO_COR, TIPO_EVENTO_LABEL, type CalendarioEvento } from "../lib/types";

type Props = {
  refDate: Date;
  eventos: CalendarioEvento[];
  onDayClick: (iso: string) => void;
  onEventClick: (e: CalendarioEvento) => void;
};

export function CalendarioSemana({ refDate, eventos, onDayClick, onEventClick }: Props) {
  const inicio = startOfWeek(refDate, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicio, end: endOfWeek(refDate, { weekStartsOn: 0 }) });

  const porDia = new Map<string, CalendarioEvento[]>();
  for (const ev of eventos) {
    const arr = porDia.get(ev.data);
    if (arr) arr.push(ev);
    else porDia.set(ev.data, [ev]);
  }

  return (
    <div className="divide-y rounded-md border">
      {dias.map((dia) => {
        const iso = format(dia, "yyyy-MM-dd");
        const domingo = getDay(dia) === 0;
        const feriado = getFeriado(iso);
        const hoje = isToday(dia);
        const doDia = porDia.get(iso) ?? [];

        return (
          <div key={iso} className={cn("flex gap-3 p-3", domingo && "bg-muted/30")}>
            <div className="w-12 shrink-0 text-center">
              <div className="text-[11px] uppercase text-muted-foreground">
                {format(dia, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  hoje && "bg-primary font-semibold text-primary-foreground",
                  !hoje && feriado && "font-semibold text-red-600 dark:text-red-400",
                )}
              >
                {format(dia, "d")}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {feriado && (
                <Badge
                  variant="outline"
                  className="border-red-300 text-red-600 dark:text-red-400"
                >
                  {feriado}
                </Badge>
              )}
              {doDia.length === 0 && !feriado && (
                <span className="text-sm text-muted-foreground">—</span>
              )}
              {doDia.map((ev) => (
                <button
                  key={ev._id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-accent"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      TIPO_EVENTO_COR[ev.tipo ?? "evento"] ?? "bg-sky-500",
                    )}
                  />
                  <span className="truncate text-sm">{ev.titulo}</span>
                  {ev.ministerioNome && (
                    <span className="truncate text-xs text-muted-foreground">
                      · {ev.ministerioNome}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[10px] uppercase text-muted-foreground">
                    {TIPO_EVENTO_LABEL[ev.tipo ?? "evento"]}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onDayClick(iso)}
              title="Novo evento neste dia"
              className="h-7 w-7 shrink-0 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="mx-auto h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
