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
import { eventosPorDia } from "../lib/agrupar";
import type { CalendarioEvento } from "../lib/types";
import { PainelDoDia } from "./PainelDoDia";

const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = {
  refDate: Date; // qualquer data do ano a exibir
  eventos: CalendarioEvento[];
  // Dia selecionado (controlado pelo page). Só aparece no painel se for do ano.
  selecionado: string | null;
  onSelect: (iso: string) => void;
  onEventClick: (e: CalendarioEvento) => void;
  onPickMonth: (date: Date) => void;
  onNovo?: (iso: string) => void;
  podeCriar?: boolean;
  pregadores?: Record<string, string>;
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarioAno({
  refDate,
  eventos,
  selecionado,
  onSelect,
  onEventClick,
  onPickMonth,
  onNovo,
  podeCriar = true,
  pregadores,
}: Props) {
  const ano = refDate.getFullYear();
  const porDia = eventosPorDia(eventos);
  const comEvento = new Set(porDia.keys());

  // Dia do painel: usa o selecionado se for deste ano, senão hoje-no-ano ou 1º/jan.
  const anoStr = String(ano);
  const defaultDia = new Date().getFullYear() === ano ? format(new Date(), "yyyy-MM-dd") : `${anoStr}-01-01`;
  const selEfetivo = selecionado && selecionado.slice(0, 4) === anoStr ? selecionado : defaultDia;
  const eventosDoDia = porDia.get(selEfetivo) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, mes) => {
          const primeiro = new Date(ano, mes, 1);
          const dias = eachDayOfInterval({
            start: startOfWeek(startOfMonth(primeiro), { weekStartsOn: 0 }),
            end: endOfWeek(endOfMonth(primeiro), { weekStartsOn: 0 }),
          });
          return (
            <div key={mes} className="rounded-lg border p-3">
              <button
                type="button"
                onClick={() => onPickMonth(primeiro)}
                className="mb-2 w-full text-left text-sm font-semibold hover:underline"
              >
                {capitalizar(format(primeiro, "MMMM", { locale: ptBR }))}
              </button>
              <div className="grid grid-cols-7 gap-0.5 text-center sm:gap-1">
                {INICIAIS.map((ini, i) => (
                  <div key={i} className="text-[10px] font-medium text-muted-foreground">
                    {ini}
                  </div>
                ))}
                {dias.map((dia) => {
                  const iso = format(dia, "yyyy-MM-dd");
                  const doMes = isSameMonth(dia, primeiro);
                  if (!doMes) return <div key={iso} className="aspect-square" />;
                  const feriado = getFeriado(iso);
                  const hoje = isToday(dia);
                  const temEvento = comEvento.has(iso);
                  const sel = iso === selEfetivo;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => onSelect(iso)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-full text-[11px] leading-none transition-colors hover:ring-1 hover:ring-primary",
                        hoje && "bg-primary font-semibold text-primary-foreground",
                        !hoje && sel && "ring-2 ring-primary",
                        !hoje && !sel && temEvento && "bg-primary/10 font-semibold text-foreground",
                        !hoje && feriado && "font-semibold text-red-600 dark:text-red-400",
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

      <PainelDoDia
        iso={selEfetivo}
        eventos={eventosDoDia}
        onEventClick={onEventClick}
        onNovo={onNovo}
        podeCriar={podeCriar}
        pregador={pregadores?.[selEfetivo]}
      />
    </div>
  );
}
