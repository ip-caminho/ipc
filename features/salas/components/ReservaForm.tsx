"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { TIME_OPTIONS } from "../lib/validations";
import { cn } from "@/shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";

interface ReservaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salaId: Id<"salas">;
  salaNome: string;
  defaultData?: string;
}

export function ReservaForm({
  open,
  onOpenChange,
  salaId,
  salaNome,
  defaultData,
}: ReservaFormProps) {
  // @ts-ignore Convex TS2589
  const createReserva = useMutation(api.salas.mutations.createReserva);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(defaultData || new Date().toISOString().split("T")[0]);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState("");

  // Buscar reservas existentes pra esta sala e data
  // @ts-ignore Convex TS2589
  const reservas = useQuery(api.salas.queries.listReservas, { data });
  const salaReservas = useMemo(() =>
    (reservas || []).filter((r: any) => r.salaId === salaId),
    [reservas, salaId]
  );

  // Slots ocupados
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

  // Calcular range contínuo dos slots selecionados
  const range = useMemo(() => {
    if (selectedSlots.size === 0) return null;
    const sorted = TIME_OPTIONS.filter((t) => selectedSlots.has(t));
    const inicio = sorted[0];
    const ultimoSlot = sorted[sorted.length - 1];
    // Fim = próximo slot após o último selecionado
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
      onOpenChange(false);
      setSelectedSlots(new Set());
      setMotivo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reservar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">Reservar {salaNome}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
          {/* Data */}
          <div className="space-y-1">
            <Label>Data</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => { setData(e.target.value); setSelectedSlots(new Set()); }}
              className="text-base min-h-[44px]"
            />
          </div>

          {/* Grid de horários */}
          <div className="space-y-2">
            <Label>
              Selecione os horarios
              {range && (
                <span className="text-muted-foreground font-normal ml-1">
                  — {range.inicio} ate {range.fim}
                </span>
              )}
            </Label>
            <div className="grid grid-cols-5 gap-1.5 max-h-[35vh] overflow-y-auto">
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

          {/* Motivo + confirmar */}
          {selectedSlots.size > 0 && (
            <>
              <div className="space-y-1">
                <Label>Motivo</Label>
                <Input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Ensaio, reuniao, aula..."
                  className="text-base min-h-[44px]"
                  autoFocus
                />
              </div>
              <Button
                className="w-full min-h-[48px]"
                disabled={loading || !motivo.trim()}
                onClick={handleSubmit}
              >
                {loading ? "Reservando..." : `Reservar ${range?.inicio} — ${range?.fim}`}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
