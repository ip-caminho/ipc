"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mic } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { feriadosDoAno, getFeriado } from "../lib/feriados";
import { eventosPorDia } from "../lib/agrupar";
import { TIPO_EVENTO_COR, TIPO_EVENTO_LABEL, type CalendarioEvento } from "../lib/types";

type Props = {
  refDate: Date;
  eventos: CalendarioEvento[];
  onEventClick: (e: CalendarioEvento) => void;
  pregadores?: Record<string, string>;
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarioLista({ refDate, eventos, onEventClick, pregadores }: Props) {
  const ano = refDate.getFullYear();
  const mes = refDate.getMonth();

  // Datas a exibir: dias com evento (expandindo intervalos início/fim) OU
  // feriado do mês em foco. Filtra ao mês para não vazar dias de eventos que
  // se estendem para o mês seguinte.
  const porDia = eventosPorDia(eventos);
  const doMes = (iso: string) =>
    Number(iso.slice(0, 4)) === ano && Number(iso.slice(5, 7)) - 1 === mes;
  const datas = new Set<string>();
  for (const iso of porDia.keys()) if (doMes(iso)) datas.add(iso);
  for (const iso of Object.keys(feriadosDoAno(ano))) {
    if (Number(iso.slice(5, 7)) - 1 === mes) datas.add(iso);
  }
  if (pregadores) for (const iso of Object.keys(pregadores)) if (doMes(iso)) datas.add(iso);
  const ordenadas = [...datas].sort();

  if (ordenadas.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nenhum evento neste mês.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ordenadas.map((iso) => {
        const d = parseISO(iso);
        const feriado = getFeriado(iso);
        const doDia = porDia.get(iso) ?? [];
        return (
          <div key={iso}>
            <div className="mb-1 flex items-center gap-2 border-b pb-1">
              <span className="text-sm font-medium">
                {capitalizar(format(d, "EEEE, dd/MM", { locale: ptBR }))}
              </span>
              {feriado && (
                <Badge
                  variant="outline"
                  className="border-red-300 text-red-600 dark:text-red-400"
                >
                  {feriado}
                </Badge>
              )}
            </div>
            {pregadores?.[iso] && (
              <div className="mb-1 flex items-center gap-1 px-1 text-xs text-indigo-600 dark:text-indigo-400">
                <Mic className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Pregação: {pregadores[iso]}</span>
              </div>
            )}
            {doDia.length === 0 ? (
              <p className="px-1 py-1 text-xs text-muted-foreground">Sem eventos</p>
            ) : (
              <div className="space-y-1">
                {doDia.map((ev) => (
                  <button
                    key={ev._id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left hover:bg-accent"
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
            )}
          </div>
        );
      })}
    </div>
  );
}
