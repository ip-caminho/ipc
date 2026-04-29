"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@shared/components/auth/SemPermissaoFallback";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { format, addDays, isSaturday, isSunday, nextSaturday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReservaForm } from "@features/salas/components/ReservaForm";
import type { Id } from "@/convex/_generated/dataModel";

function getWeekendStart(date: Date): Date {
  if (isSaturday(date)) return date;
  if (isSunday(date)) return addDays(date, -1);
  return nextSaturday(date);
}

function SalasContent() {
  // @ts-ignore Convex TS2589
  const salas = useQuery(api.salas.queries.listSalas);

  const hoje = useMemo(() => startOfDay(new Date()), []);
  const [weekendStart, setWeekendStart] = useState(() => getWeekendStart(hoje));

  const sabado = format(weekendStart, "yyyy-MM-dd");
  const domingo = format(addDays(weekendStart, 1), "yyyy-MM-dd");
  const [selectedDay, setSelectedDay] = useState<"sab" | "dom">(
    isSunday(hoje) ? "dom" : "sab"
  );
  const selectedDate = selectedDay === "sab" ? sabado : domingo;

  // @ts-ignore Convex TS2589
  const reservas = useQuery(api.salas.queries.listReservas, { data: selectedDate });
  // @ts-ignore Convex TS2589
  const minhasReservas = useQuery(api.salas.queries.minhasReservas);
  const cancelReserva = useMutation(api.salas.mutations.cancelReserva);

  const [formSalaId, setFormSalaId] = useState<Id<"salas"> | null>(null);

  const prevWeekend = () => setWeekendStart((d) => addDays(d, -7));
  const nextWeekend = () => setWeekendStart((d) => addDays(d, 7));

  const canGoPrev = weekendStart > hoje || (isSaturday(hoje) || isSunday(hoje));

  const handleReservar = (salaId: Id<"salas">) => {
    setFormSalaId(salaId);
  };

  const formSalaNome = salas?.find((s) => s._id === formSalaId)?.nome ?? "";

  const sabLabel = format(weekendStart, "dd", { locale: ptBR });
  const domLabel = format(addDays(weekendStart, 1), "dd", { locale: ptBR });
  const mesLabel = format(weekendStart, "MMMM", { locale: ptBR });

  if (salas === undefined) {
    return (
      <ModuloGuard modulo="salas">
        <HeaderLayout>
        <div className="space-y-4">
          <PageHeader title="Salas" />
          <Skeleton className="h-64" />
        </div>
        </HeaderLayout>
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="salas">
      {formSalaId ? (
        <ReservaForm
          salaId={formSalaId}
          salaNome={formSalaNome}
          defaultData={selectedDate}
          onBack={() => setFormSalaId(null)}
        />
      ) : (
      <HeaderLayout>
      <div className="space-y-5">
        <PageHeader title="Salas" />

        {/* Weekend navigator */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            disabled={!canGoPrev}
            onClick={prevWeekend}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground capitalize">{mesLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={nextWeekend}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Sab / Dom toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedDay("sab")}
            className={cn(
              "rounded-xl py-3 text-center transition-colors",
              selectedDay === "sab"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className="text-2xl font-bold block">{sabLabel}</span>
            <span className="text-xs">Sábado</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDay("dom")}
            className={cn(
              "rounded-xl py-3 text-center transition-colors",
              selectedDay === "dom"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className="text-2xl font-bold block">{domLabel}</span>
            <span className="text-xs">Domingo</span>
          </button>
        </div>

        {/* Salas */}
        {reservas === undefined ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="space-y-3">
            {salas.map((sala) => {
              const salaReservas = reservas.filter((r: any) => r.salaId === sala._id);
              const livre = salaReservas.length === 0;

              return (
                <button
                  key={sala._id}
                  type="button"
                  onClick={() => handleReservar(sala._id)}
                  className="w-full rounded-xl border border-border p-4 space-y-2 text-left hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{sala.nome}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </div>

                  {livre ? (
                    <p className="text-sm text-green-600 dark:text-green-400">Disponivel o dia todo</p>
                  ) : (
                    <div className="space-y-1">
                      {salaReservas.map((r: any) => (
                        <p key={r._id} className="text-xs text-muted-foreground">
                          {r.horaInicio} – {r.horaFim} · {r.membroNome}
                        </p>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Minhas Reservas */}
        {minhasReservas && minhasReservas.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <h2 className="text-sm font-semibold text-muted-foreground">Minhas reservas</h2>
            <div className="space-y-2">
              {minhasReservas.map((r: any) => (
                <div key={r._id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.salaNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.data.split("-").reverse().join("/")} · {r.horaInicio} – {r.horaFim}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{r.motivo}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={async () => {
                      if (!confirm("Cancelar esta reserva?")) return;
                      try {
                        await cancelReserva({ id: r._id });
                        toast.success("Reserva cancelada");
                      } catch (e: any) {
                        toast.error(e?.message || "Erro");
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </HeaderLayout>
      )}
    </ModuloGuard>
  );
}

export default function SalasPage() {
  return (
    <PermissionGate permission="salas:read" fallback={<SemPermissaoFallback />}>
      <SalasContent />
    </PermissionGate>
  );
}
