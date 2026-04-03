"use client";

import { useMutation } from "convex/react";
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
import { useState } from "react";
import { TIME_OPTIONS } from "../lib/validations";
import { cn } from "@/shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";

interface ReservaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salaId: Id<"salas">;
  salaNome: string;
  defaultData?: string;
  defaultHoraInicio?: string;
}

export function ReservaForm({
  open,
  onOpenChange,
  salaId,
  salaNome,
  defaultData,
  defaultHoraInicio,
}: ReservaFormProps) {
  // @ts-ignore Convex TS2589
  const createReserva = useMutation(api.salas.mutations.createReserva);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(defaultData || new Date().toISOString().split("T")[0]);
  const [horaInicio, setHoraInicio] = useState(defaultHoraInicio || "");
  const [horaFim, setHoraFim] = useState("");
  const [motivo, setMotivo] = useState("");

  const endOptions = TIME_OPTIONS.filter((t) => t > horaInicio);

  const handleSubmit = async () => {
    if (!data || !horaInicio || !horaFim || !motivo.trim()) return;
    setLoading(true);
    try {
      await createReserva({ salaId, data, horaInicio, horaFim, motivo: motivo.trim() });
      toast.success("Sala reservada");
      onOpenChange(false);
      setHoraInicio("");
      setHoraFim("");
      setMotivo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reservar");
    } finally {
      setLoading(false);
    }
  };

  const step = !horaInicio ? "inicio" : !horaFim ? "fim" : "motivo";

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
              onChange={(e) => setData(e.target.value)}
              className="text-base min-h-[44px]"
            />
          </div>

          {/* Hora início */}
          <div className="space-y-2">
            <Label>{step === "inicio" ? "Selecione o horário de início" : `Início: ${horaInicio}`}</Label>
            {step === "inicio" && (
              <div className="grid grid-cols-5 gap-1.5 max-h-[30vh] overflow-y-auto">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHoraInicio(t)}
                    className="h-10 text-sm rounded-md bg-muted hover:bg-accent transition-colors font-medium"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {step !== "inicio" && (
              <button
                type="button"
                onClick={() => { setHoraInicio(""); setHoraFim(""); }}
                className="text-xs text-primary"
              >
                Alterar
              </button>
            )}
          </div>

          {/* Hora fim */}
          {horaInicio && (
            <div className="space-y-2">
              <Label>{step === "fim" ? "Selecione o horário de término" : `Término: ${horaFim}`}</Label>
              {step === "fim" && (
                <div className="grid grid-cols-5 gap-1.5 max-h-[30vh] overflow-y-auto">
                  {endOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setHoraFim(t)}
                      className="h-10 text-sm rounded-md bg-muted hover:bg-accent transition-colors font-medium"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {step === "motivo" && (
                <button
                  type="button"
                  onClick={() => setHoraFim("")}
                  className="text-xs text-primary"
                >
                  Alterar
                </button>
              )}
            </div>
          )}

          {/* Motivo + confirmar */}
          {step === "motivo" && (
            <>
              <div className="space-y-1">
                <Label>Motivo</Label>
                <Input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Ensaio, reunião, aula..."
                  className="text-base min-h-[44px]"
                  autoFocus
                />
              </div>
              <Button
                className="w-full min-h-[48px]"
                disabled={loading || !motivo.trim()}
                onClick={handleSubmit}
              >
                {loading ? "Reservando..." : "Confirmar reserva"}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
