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
  isSunday,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, Minus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils/cn";
import { useState } from "react";
import { useFuncoes } from "@features/escalas/hooks/useFuncoes";

interface CalendarioViewProps {
  cultos: any[];
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function CalendarioView({ cultos }: CalendarioViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const funcoes = useFuncoes();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const cultosByDate = new Map<string, any>();
  cultos.forEach((c) => cultosByDate.set(c.data, c));

  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => setCurrentMonth(new Date());

  const totalFuncoes = funcoes?.length ?? 7;

  const countFilled = (culto: any) => {
    if (!culto?.escalas) return 0;
    const funcoes = new Set(culto.escalas.map((e: any) => e.funcao));
    return funcoes.size;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold capitalize min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>
          Hoje
        </Button>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2 capitalize">
              {d}
            </div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const culto = cultosByDate.get(dateStr);
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const sunday = isSunday(day);
            const filled = countFilled(culto);

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[80px] p-1.5 border-b border-r text-xs",
                  !inMonth && "bg-muted/20 text-muted-foreground/40",
                  today && "bg-primary/5",
                )}
              >
                {/* Numero do dia */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px]",
                      today && "bg-primary text-primary-foreground font-bold",
                      sunday && !today && inMonth && "font-semibold text-primary",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Conteudo do culto */}
                {culto && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      {filled === totalFuncoes ? (
                        <Check className="h-3 w-3 text-green-500 shrink-0" />
                      ) : filled > 0 ? (
                        <Minus className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {filled}/{totalFuncoes}
                      </span>
                    </div>
                    {/* Pregador */}
                    {(() => {
                      const pregacao = culto.escalas?.find((e: any) => e.funcao === "PREGACAO");
                      if (!pregacao) return null;
                      return (
                        <p className="text-[10px] truncate font-medium">
                          {pregacao.membroNome}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Check className="h-3 w-3 text-green-500" />
          <span>Completo</span>
        </div>
        <div className="flex items-center gap-1">
          <Minus className="h-3 w-3 text-amber-500" />
          <span>Parcial</span>
        </div>
      </div>
    </div>
  );
}
