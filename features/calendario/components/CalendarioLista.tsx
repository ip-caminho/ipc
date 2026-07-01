"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { feriadosDoAno, getFeriado } from "../lib/feriados";
import { TIPO_EVENTO_COR, TIPO_EVENTO_LABEL, type CalendarioEvento } from "../lib/types";

type Props = {
  refDate: Date;
  eventos: CalendarioEvento[];
  onEventClick: (e: CalendarioEvento) => void;
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarioLista({ refDate, eventos, onEventClick }: Props) {
  const ano = refDate.getFullYear();
  const mes = refDate.getMonth();

  // Datas a exibir: dias com evento OU feriado do mês em foco.
  const datas = new Set<string>();
  for (const e of eventos) datas.add(e.data);
  for (const iso of Object.keys(feriadosDoAno(ano))) {
    if (Number(iso.slice(5, 7)) - 1 === mes) datas.add(iso);
  }
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
        const doDia = eventos.filter((e) => e.data === iso);
        return (
          <div key={iso}>
            <div className="mb-1 flex items-center gap-2 border-b pb-1">
              <span className="text-sm font-medium">
                {capitalizar(format(d, "EEEE, dd/MM", { locale: ptBR }))}
              </span>
              {feriado && (
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-700 dark:text-amber-400"
                >
                  {feriado}
                </Badge>
              )}
            </div>
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
