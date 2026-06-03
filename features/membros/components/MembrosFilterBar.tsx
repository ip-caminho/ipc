"use client";

import { STATUS_OPTIONS, CARGO_ECLESIASTICO_OPTIONS } from "../lib/constants";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
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

// Sentinela para "Ativos" (value ""), pois radix usa string vazia como deseleção
const ATIVOS = "__ATIVOS__";

const PILL =
  "shrink-0 rounded-full border border-input px-4 text-xs font-medium text-foreground hover:bg-muted data-[state=on]:border-transparent data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background";

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
      <ToggleGroup
        type="single"
        size="sm"
        spacing={2}
        value={status === "" ? ATIVOS : status}
        onValueChange={(v) => {
          if (v) onStatusChange(v === ATIVOS ? "" : v);
        }}
        aria-label="Filtrar por status"
        className="justify-start overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
      >
        {STATUS_CHIPS.map((chip) => (
          <ToggleGroupItem
            key={chip.value}
            value={chip.value === "" ? ATIVOS : chip.value}
            className={PILL}
          >
            {chip.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

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
