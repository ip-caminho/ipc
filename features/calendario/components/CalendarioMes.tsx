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
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { getFeriado } from "../lib/feriados";
import { TIPO_EVENTO_COR, TIPO_EVENTO_LABEL, type CalendarioEvento } from "../lib/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  refDate: Date;
  eventos: CalendarioEvento[];
  // Dia selecionado (controlado pelo page — sobrevive ao reload da query).
  selecionado: string | null;
  onSelect: (iso: string) => void;
  onDayClick: (iso: string) => void;
  onEventClick: (e: CalendarioEvento) => void;
  onNavigate: (date: Date) => void;
  podeCriar?: boolean;
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CalendarioMes({
  refDate,
  eventos,
  selecionado,
  onSelect,
  onDayClick,
  onEventClick,
  onNavigate,
  podeCriar = true,
}: Props) {
  const inicio = startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 });
  const fim = endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  const porDia = new Map<string, CalendarioEvento[]>();
  for (const ev of eventos) {
    const arr = porDia.get(ev.data);
    if (arr) arr.push(ev);
    else porDia.set(ev.data, [ev]);
  }

  // Dia selecionado (mostra os eventos no painel abaixo). Se o selecionado não
  // for do mês visível (após navegar), cai em hoje-no-mês ou no dia 1.
  const mesRef = format(refDate, "yyyy-MM");
  const defaultDia = isSameMonth(new Date(), refDate)
    ? format(new Date(), "yyyy-MM-dd")
    : format(startOfMonth(refDate), "yyyy-MM-dd");
  const selEfetivo =
    selecionado && selecionado.slice(0, 7) === mesRef ? selecionado : defaultDia;

  const eventosDoDia = porDia.get(selEfetivo) ?? [];
  const feriadoSel = getFeriado(selEfetivo);

  return (
    <div className="space-y-3">
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
            const selecionado = iso === selEfetivo;
            const doDia = porDia.get(iso) ?? [];

            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  onSelect(iso);
                  if (!doMes) onNavigate(dia); // clicar num dia vazante muda de mês
                }}
                className={cn(
                  "flex min-h-[60px] flex-col items-stretch border-b border-r p-1 text-left transition-colors last:border-r-0 hover:bg-accent/50 sm:min-h-[92px]",
                  !doMes && "bg-muted/20 text-muted-foreground",
                  domingo && doMes && "bg-muted/30",
                  feriado && "bg-amber-50 dark:bg-amber-950/20",
                  selecionado && "ring-2 ring-inset ring-primary",
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
                  <p className="mt-0.5 hidden truncate text-[10px] leading-tight text-amber-700 dark:text-amber-400 sm:block">
                    {feriado}
                  </p>
                )}

                {/* Indicadores dos eventos (não interativos — o toque seleciona o
                    dia e a lista grande aparece no painel abaixo). Mobile: dots;
                    desktop: chips com título. */}
                {doDia.length > 0 && (
                  <>
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {doDia.slice(0, 5).map((ev) => (
                        <span
                          key={ev._id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            TIPO_EVENTO_COR[ev.tipo ?? "evento"] ?? "bg-sky-500",
                          )}
                        />
                      ))}
                    </div>
                    <div className="mt-0.5 hidden space-y-0.5 sm:block">
                      {doDia.slice(0, 4).map((ev) => (
                        <div key={ev._id} className="flex items-center gap-1">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              TIPO_EVENTO_COR[ev.tipo ?? "evento"] ?? "bg-sky-500",
                            )}
                          />
                          <span className="truncate text-[11px] leading-tight">{ev.titulo}</span>
                        </div>
                      ))}
                      {doDia.length > 4 && (
                        <p className="text-[10px] text-muted-foreground">+{doDia.length - 4}</p>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel do dia selecionado — alvos grandes, fáceis de tocar no mobile */}
      <div className="rounded-md border p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {capitalizar(format(parseISO(selEfetivo), "EEEE, dd/MM", { locale: ptBR }))}
          </span>
          {feriadoSel && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
              {feriadoSel}
            </Badge>
          )}
        </div>

        {eventosDoDia.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">Nenhum evento neste dia.</p>
        ) : (
          <div className="space-y-1">
            {eventosDoDia.map((ev) => (
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

        {podeCriar && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onDayClick(selEfetivo)}
          >
            <Plus className="mr-1 h-4 w-4" /> Novo evento neste dia
          </Button>
        )}
      </div>
    </div>
  );
}
