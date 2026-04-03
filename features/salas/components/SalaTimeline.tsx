"use client";

import { cn } from "@/shared/lib/utils/cn";
import { X } from "lucide-react";

interface Reserva {
  _id: string;
  horaInicio: string;
  horaFim: string;
  membroNome: string;
  motivo: string;
  membroId: string;
}

interface SalaTimelineProps {
  reservas: Reserva[];
  currentMembroId?: string;
  onSlotTap?: (hora: string) => void;
  onCancel?: (id: string) => void;
}

const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 48;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function SalaTimeline({ reservas, currentMembroId, onSlotTap, onCancel }: SalaTimelineProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
  const startMinutes = HOUR_START * 60;

  return (
    <div className="relative" style={{ height: totalHeight }}>
      {/* Hour lines */}
      {hours.map((hour) => {
        const top = (hour - HOUR_START) * HOUR_HEIGHT;
        return (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border/50"
            style={{ top }}
          >
            <span className="text-[10px] text-muted-foreground/60 absolute -top-2.5 left-0 w-10 text-right pr-2">
              {String(hour).padStart(2, "0")}:00
            </span>
          </div>
        );
      })}

      {/* Clickable empty areas */}
      {onSlotTap && hours.slice(0, -1).map((hour) => {
        const top = (hour - HOUR_START) * HOUR_HEIGHT;
        const hourStr = `${String(hour).padStart(2, "0")}:00`;
        const isOccupied = reservas.some(
          (r) => timeToMinutes(r.horaInicio) < (hour + 1) * 60 && timeToMinutes(r.horaFim) > hour * 60
        );
        if (isOccupied) return null;
        return (
          <button
            key={`slot-${hour}`}
            type="button"
            onClick={() => onSlotTap(hourStr)}
            className="absolute left-12 right-0 hover:bg-primary/5 active:bg-primary/10 transition-colors rounded"
            style={{ top, height: HOUR_HEIGHT }}
          />
        );
      })}

      {/* Reservation blocks */}
      {reservas.map((r) => {
        const startMin = timeToMinutes(r.horaInicio) - startMinutes;
        const endMin = timeToMinutes(r.horaFim) - startMinutes;
        const top = (startMin / 60) * HOUR_HEIGHT;
        const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
        const isOwn = r.membroId === currentMembroId;

        return (
          <div
            key={r._id}
            className={cn(
              "absolute left-12 right-0 rounded-lg px-3 py-1.5 overflow-hidden border",
              isOwn
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted border-border text-foreground"
            )}
            style={{ top, height: Math.max(height, 28) }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">
                  {r.horaInicio}–{r.horaFim}
                </p>
                <p className="text-[10px] truncate opacity-70">
                  {r.membroNome} · {r.motivo}
                </p>
              </div>
              {isOwn && onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(r._id)}
                  className="shrink-0 p-0.5 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
