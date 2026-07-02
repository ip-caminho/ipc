"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Mic } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { getFeriado } from "../lib/feriados";
import { TIPO_EVENTO_COR, TIPO_EVENTO_LABEL, type CalendarioEvento } from "../lib/types";

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Props = {
  iso: string; // dia selecionado
  eventos: CalendarioEvento[]; // eventos desse dia
  onEventClick: (e: CalendarioEvento) => void;
  onNovo?: (iso: string) => void;
  podeCriar?: boolean;
  // Quem prega neste dia (culto), quando o toggle "Pregadores" está ligado.
  pregador?: string;
};

// Painel de detalhe do dia selecionado — alvos grandes, fáceis de tocar no
// mobile. Reusado pelas visões Mês e Ano.
export function PainelDoDia({ iso, eventos, onEventClick, onNovo, podeCriar = true, pregador }: Props) {
  const feriado = getFeriado(iso);

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {capitalizar(format(parseISO(iso), "EEEE, dd/MM", { locale: ptBR }))}
        </span>
        {feriado && (
          <Badge variant="outline" className="border-red-300 text-red-600 dark:text-red-400">
            {feriado}
          </Badge>
        )}
      </div>

      {pregador && (
        <div className="mb-3 flex items-center gap-1.5 text-sm">
          <Mic className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span className="text-muted-foreground">Pregação:</span>
          <span className="truncate font-medium">{pregador}</span>
        </div>
      )}

      {eventos.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">Nenhum evento neste dia.</p>
      ) : (
        <div className="space-y-1">
          {eventos.map((ev) => (
            <button
              key={ev._id}
              type="button"
              onClick={() => onEventClick(ev)}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-accent"
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
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

      {podeCriar && onNovo && (
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => onNovo(iso)}>
          <Plus className="mr-1 h-4 w-4" /> Novo evento neste dia
        </Button>
      )}
    </div>
  );
}
