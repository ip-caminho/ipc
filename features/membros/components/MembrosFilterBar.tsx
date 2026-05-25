"use client";

import { cn } from "@shared/lib/utils/cn";
import { STATUS_OPTIONS, CARGO_ECLESIASTICO_OPTIONS } from "../lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type StatusChip = { value: string; label: string };

const STATUS_CHIPS: StatusChip[] = [
  { value: "", label: "Ativos" },
  { value: "TODOS", label: "Todos" },
  ...STATUS_OPTIONS.filter((o) => o.value !== "ATIVO"),
];

interface MembrosFilterBarProps {
  status: string;
  onStatusChange: (value: string) => void;
  cargo: string;
  onCargoChange: (value: string) => void;
}

export function MembrosFilterBar({
  status,
  onStatusChange,
  cargo,
  onCargoChange,
}: MembrosFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
        role="tablist"
        aria-label="Filtrar por status"
      >
        {STATUS_CHIPS.map((chip) => {
          const active = status === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(chip.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors min-h-[32px] whitespace-nowrap",
                active
                  ? "bg-foreground text-background"
                  : "border text-foreground",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <Select value={cargo} onValueChange={onCargoChange}>
        <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
          <SelectValue placeholder="Cargo eclesiástico" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos os cargos</SelectItem>
          {CARGO_ECLESIASTICO_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
