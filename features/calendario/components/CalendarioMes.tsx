"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  getDay,
} from "date-fns";
import { cn } from "@/shared/lib/utils/cn";
import { getFeriado } from "../lib/feriados";
import { TIPO_EVENTO_COR, type CalendarioEvento } from "../lib/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  refDate: Date;
  eventos: CalendarioEvento[];
  onDayClick: (iso: string) => void;
  onEventClick: (e: CalendarioEvento) => void;
};

export function CalendarioMes({ refDate, eventos, onDayClick, onEventClick }: Props) {
  const inicio = startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 });
  const fim = endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  const porDia = new Map<string, CalendarioEvento[]>();
  for (const ev of eventos) {
    const arr = porDia.get(ev.data);
    if (arr) arr.push(ev);
    else porDia.set(ev.data, [ev]);
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const iso = format(dia, "yyyy-MM-dd");
          const doMes = isSameMonth(dia, refDate);
          const domingo = getDay(dia) === 0;
          const feriado = getFeriado(iso);
          const hoje = isToday(dia);
          const doDia = porDia.get(iso) ?? [];

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onDayClick(iso)}
              className={cn(
                "min-h-[84px] border-b border-r p-1 text-left align-top transition-colors last:border-r-0 hover:bg-accent/50 sm:min-h-[104px]",
                !doMes && "bg-muted/20 text-muted-foreground",
                domingo && doMes && "bg-muted/30",
                feriado && "bg-amber-50 dark:bg-amber-950/20",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    hoje && "bg-primary font-semibold text-primary-foreground",
                    !hoje && feriado && "font-semibold text-amber-700 dark:text-amber-400",
                    !hoje && !feriado && domingo && "font-medium text-foreground",
                  )}
                >
                  {format(dia, "d")}
                </span>
              </div>

              {feriado && (
                <p className="mt-0.5 truncate text-[10px] leading-tight text-amber-700 dark:text-amber-400">
                  {feriado}
                </p>
              )}

              <div className="mt-0.5 space-y-0.5">
                {doDia.slice(0, 3).map((ev) => (
                  <div
                    key={ev._id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onEventClick(ev);
                      }
                    }}
                    className="flex items-center gap-1 rounded px-0.5 hover:bg-background"
                    title={ev.titulo}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        TIPO_EVENTO_COR[ev.tipo ?? "evento"] ?? "bg-sky-500",
                      )}
                    />
                    <span className="hidden truncate text-[11px] leading-tight sm:inline">
                      {ev.titulo}
                    </span>
                  </div>
                ))}
                {doDia.length > 3 && (
                  <p className="px-0.5 text-[10px] text-muted-foreground">+{doDia.length - 3}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
