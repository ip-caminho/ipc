"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { TIME_OPTIONS } from "../lib/validations";
import { cn } from "@/shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react";

interface ReservaFormProps {
  salaId: Id<"salas">;
  salaNome: string;
  defaultData?: string;
  onBack: () => void;
}

export function ReservaForm({
  salaId,
  salaNome,
  defaultData,
  onBack,
}: ReservaFormProps) {
  // @ts-ignore Convex TS2589
  const createReserva = useMutation(api.salas.mutations.createReserva);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(defaultData || new Date().toISOString().split("T")[0]);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState("");
  const [showMotivo, setShowMotivo] = useState(false);

  // @ts-ignore Convex TS2589
  const reservas = useQuery(api.salas.queries.listReservas, { data });
  const salaReservas = useMemo(() =>
    (reservas || []).filter((r: any) => r.salaId === salaId),
    [reservas, salaId]
  );

  // Slots ocupados ou passados
  const hoje = new Date().toISOString().split("T")[0];
  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const isHoje = data === hoje;
  const isPast = data < hoje;

  const occupiedSlots = useMemo(() => {
    const occupied = new Set<string>();
    for (const r of salaReservas) {
      for (const t of TIME_OPTIONS) {
        if (t >= r.horaInicio && t < r.horaFim) {
          occupied.add(t);
        }
      }
    }
    return occupied;
  }, [salaReservas]);

  const isSlotDisabled = (slot: string) => {
    if (isPast) return true;
    if (isHoje && slot <= horaAtual) return true;
    if (occupiedSlots.has(slot)) return true;
    return false;
  };

  const toggleSlot = (slot: string) => {
    if (isSlotDisabled(slot)) return;
    setShowMotivo(false);
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else {
        next.add(slot);
      }
      return next;
    });
  };

  // Agrupar slots selecionados em ranges contíguos
  const ranges = useMemo(() => {
    if (selectedSlots.size === 0) return [];
    const sorted = TIME_OPTIONS.filter((t) => selectedSlots.has(t));
    const groups: { inicio: string; fim: string }[] = [];
    let groupStart = sorted[0];
    let prevIdx = TIME_OPTIONS.indexOf(sorted[0]);

    for (let i = 1; i < sorted.length; i++) {
      const curIdx = TIME_OPTIONS.indexOf(sorted[i]);
      if (curIdx !== prevIdx + 1) {
        // Gap — fechar grupo anterior
        const fimIdx = prevIdx + 1;
        groups.push({
          inicio: groupStart,
          fim: fimIdx < TIME_OPTIONS.length ? TIME_OPTIONS[fimIdx] : "22:30",
        });
        groupStart = sorted[i];
      }
      prevIdx = curIdx;
    }
    // Último grupo
    const fimIdx = prevIdx + 1;
    groups.push({
      inicio: groupStart,
      fim: fimIdx < TIME_OPTIONS.length ? TIME_OPTIONS[fimIdx] : "22:30",
    });

    return groups;
  }, [selectedSlots]);

  const rangeLabel = ranges.map((r) => `${r.inicio}–${r.fim}`).join(", ");

  const handleSubmit = async () => {
    if (ranges.length === 0 || !motivo.trim()) return;
    setLoading(true);
    try {
      for (const r of ranges) {
        await createReserva({
          salaId,
          data,
          horaInicio: r.inicio,
          horaFim: r.fim,
          motivo: motivo.trim(),
        });
      }
      toast.success(ranges.length > 1 ? `${ranges.length} reservas criadas` : "Sala reservada");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reservar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Reservar {salaNome}</h2>
          {ranges.length > 0 && (
            <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          )}
        </div>
      </div>

      {/* Data */}
      <div className="space-y-1">
        <Label>Data</Label>
        <Input
          type="date"
          value={data}
          min={hoje}
          onChange={(e) => { setData(e.target.value); setSelectedSlots(new Set()); setShowMotivo(false); }}
          className="text-base"
        />
      </div>

      {/* Grid de horários */}
      <div className="space-y-2">
        <Label>Selecione os horarios</Label>
        <div className="grid grid-cols-4 gap-2">
          {TIME_OPTIONS.map((t) => {
            const disabled = isSlotDisabled(t);
            const isOccupied = occupiedSlots.has(t);
            const isSelected = selectedSlots.has(t);
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => toggleSlot(t)}
                className={cn(
                  "h-12 text-base rounded-lg font-medium transition-colors",
                  isOccupied && "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed line-through",
                  !isOccupied && disabled && "bg-muted/50 text-muted-foreground/30 cursor-not-allowed",
                  isSelected && !disabled && "bg-primary text-primary-foreground",
                  !isSelected && !disabled && "bg-muted hover:bg-accent",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botão continuar */}
      {selectedSlots.size > 0 && !showMotivo && (
        <div className="pb-24 md:pb-4">
          <Button className="w-full" onClick={() => setShowMotivo(true)}>
            Continuar — {rangeLabel}
          </Button>
        </div>
      )}

      {/* Motivo + confirmar */}
      {showMotivo && (
        <div className="space-y-3 pb-24 md:pb-4">
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Ensaio, reuniao, aula..."
              className="text-base"
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            disabled={loading || !motivo.trim()}
            onClick={handleSubmit}
          >
            {loading ? "Reservando..." : ranges.length > 1 ? `Reservar ${ranges.length} horarios` : `Reservar ${rangeLabel}`}
          </Button>
        </div>
      )}
    </div>
  );
}
