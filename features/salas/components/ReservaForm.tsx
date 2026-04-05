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

  const toggleSlot = (slot: string) => {
    if (occupiedSlots.has(slot)) return;
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

  const range = useMemo(() => {
    if (selectedSlots.size === 0) return null;
    const sorted = TIME_OPTIONS.filter((t) => selectedSlots.has(t));
    const inicio = sorted[0];
    const ultimoSlot = sorted[sorted.length - 1];
    const ultimoIdx = TIME_OPTIONS.indexOf(ultimoSlot);
    const fim = ultimoIdx < TIME_OPTIONS.length - 1 ? TIME_OPTIONS[ultimoIdx + 1] : "22:30";
    return { inicio, fim };
  }, [selectedSlots]);

  const handleSubmit = async () => {
    if (!range || !motivo.trim()) return;
    setLoading(true);
    try {
      await createReserva({
        salaId,
        data,
        horaInicio: range.inicio,
        horaFim: range.fim,
        motivo: motivo.trim(),
      });
      toast.success("Sala reservada");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reservar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Reservar {salaNome}</h2>
          {range && (
            <p className="text-sm text-muted-foreground">{range.inicio} — {range.fim}</p>
          )}
        </div>
      </div>

      {/* Data */}
      <div className="space-y-1">
        <Label>Data</Label>
        <Input
          type="date"
          value={data}
          onChange={(e) => { setData(e.target.value); setSelectedSlots(new Set()); }}
          className="text-base"
        />
      </div>

      {/* Grid de horários */}
      <div className="space-y-2">
        <Label>Selecione os horarios</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {TIME_OPTIONS.map((t) => {
            const isOccupied = occupiedSlots.has(t);
            const isSelected = selectedSlots.has(t);
            return (
              <button
                key={t}
                type="button"
                disabled={isOccupied}
                onClick={() => toggleSlot(t)}
                className={cn(
                  "h-10 text-sm rounded-md font-medium transition-colors",
                  isOccupied && "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed line-through",
                  isSelected && !isOccupied && "bg-primary text-primary-foreground",
                  !isSelected && !isOccupied && "bg-muted hover:bg-accent",
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
        <Button className="w-full" onClick={() => setShowMotivo(true)}>
          Continuar — {range?.inicio} ate {range?.fim}
        </Button>
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
            {loading ? "Reservando..." : `Reservar ${range?.inicio} — ${range?.fim}`}
          </Button>
        </div>
      )}
    </div>
  );
}
