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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils/cn";
import { getFeriado } from "../lib/feriados";
import type { CalendarioEvento } from "../lib/types";

const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  refDate: Date; // qualquer data do ano a exibir
  eventos: CalendarioEvento[];
  onPickMonth: (date: Date) => void;
  onPickDay: (iso: string) => void;
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarioAno({ refDate, eventos, onPickMonth, onPickDay }: Props) {
  const ano = refDate.getFullYear();
  const comEvento = new Set(eventos.map((e) => e.data));

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, mes) => {
        const primeiro = new Date(ano, mes, 1);
        const dias = eachDayOfInterval({
          start: startOfWeek(startOfMonth(primeiro), { weekStartsOn: 0 }),
          end: endOfWeek(endOfMonth(primeiro), { weekStartsOn: 0 }),
        });
        return (
          <div key={mes} className="rounded-md border p-2">
            <button
              type="button"
              onClick={() => onPickMonth(primeiro)}
              className="mb-1 w-full text-left text-xs font-semibold hover:underline"
            >
              {capitalizar(format(primeiro, "MMMM", { locale: ptBR }))}
            </button>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {INICIAIS.map((ini, i) => (
                <div key={i} className="text-[9px] text-muted-foreground">
                  {ini}
                </div>
              ))}
              {dias.map((dia) => {
                const iso = format(dia, "yyyy-MM-dd");
                const doMes = isSameMonth(dia, primeiro);
                if (!doMes) return <div key={iso} />;
                const feriado = getFeriado(iso);
                const hoje = isToday(dia);
                const temEvento = comEvento.has(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onPickDay(iso)}
                    className={cn(
                      "mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none hover:ring-1 hover:ring-primary",
                      hoje && "bg-primary font-semibold text-primary-foreground",
                      !hoje && temEvento && "bg-primary/10 font-semibold text-foreground",
                      !hoje && !temEvento && feriado && "font-semibold text-amber-600 dark:text-amber-400",
                      !hoje && !temEvento && !feriado && "text-muted-foreground",
                    )}
                    title={feriado ?? undefined}
                  >
                    {format(dia, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
