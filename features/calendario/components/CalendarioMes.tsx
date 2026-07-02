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
import { Mic } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { getFeriado } from "../lib/feriados";
import { eventosPorDia } from "../lib/agrupar";
import { TIPO_EVENTO_COR, type CalendarioEvento } from "../lib/types";
import { PainelDoDia } from "./PainelDoDia";

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
  // Pregador do dia (iso -> nome), quando o toggle "Pregadores" está ligado.
  pregadores?: Record<string, string>;
};

export function CalendarioMes({
  refDate,
  eventos,
  selecionado,
  onSelect,
  onDayClick,
  onEventClick,
  onNavigate,
  podeCriar = true,
  pregadores,
}: Props) {
  const inicio = startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 });
  const fim = endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  const porDia = eventosPorDia(eventos);

  // Dia selecionado (mostra os eventos no painel abaixo). Se o selecionado não
  // for do mês visível (após navegar), cai em hoje-no-mês ou no dia 1.
  const mesRef = format(refDate, "yyyy-MM");
  const defaultDia = isSameMonth(new Date(), refDate)
    ? format(new Date(), "yyyy-MM-dd")
    : format(startOfMonth(refDate), "yyyy-MM-dd");
  const selEfetivo =
    selecionado && selecionado.slice(0, 7) === mesRef ? selecionado : defaultDia;

  const eventosDoDia = porDia.get(selEfetivo) ?? [];

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
                  feriado && "bg-red-50 dark:bg-red-950/20",
                  selecionado && "ring-2 ring-inset ring-primary",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      hoje && "bg-primary font-semibold text-primary-foreground",
                      !hoje && feriado && "font-semibold text-red-600 dark:text-red-400",
                      !hoje && !feriado && domingo && "font-medium text-foreground",
                    )}
                  >
                    {format(dia, "d")}
                  </span>
                </div>

                {feriado && (
                  <p className="mt-0.5 hidden truncate text-[10px] leading-tight text-red-600 dark:text-red-400 sm:block">
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

                {pregadores?.[iso] && (
                  <div className="mt-0.5 hidden items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 sm:flex">
                    <Mic className="h-3 w-3 shrink-0" />
                    <span className="truncate">{pregadores[iso]}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <PainelDoDia
        iso={selEfetivo}
        eventos={eventosDoDia}
        onEventClick={onEventClick}
        onNovo={onDayClick}
        podeCriar={podeCriar}
        pregador={pregadores?.[selEfetivo]}
      />
    </div>
  );
}
