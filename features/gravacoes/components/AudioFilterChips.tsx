"use client";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import type { AudioTipo } from "@features/gravacoes/lib/categoryGradient";

type Chip = { value: AudioTipo | null; label: string };

const CHIPS: Chip[] = [
  { value: null, label: "Tudo" },
  { value: "SERMAO", label: "Pregações" },
  { value: "ESTUDO_BIBLICO", label: "Estudos" },
  { value: "PALESTRA", label: "Palestras" },
  { value: "OUTRO", label: "Outros" },
];

// Sentinela para o filtro "Tudo" (radix usa string vazia como sinal de deseleção)
const ALL = "__ALL__";

const PILL =
  "shrink-0 rounded-full border border-input px-4 text-xs font-medium text-foreground hover:bg-muted data-[state=on]:border-transparent data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background";

interface AudioFilterChipsProps {
  selected: AudioTipo | null;
  onSelect: (tipo: AudioTipo | null) => void;
}

export function AudioFilterChips({ selected, onSelect }: AudioFilterChipsProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      spacing={2}
      value={selected ?? ALL}
      onValueChange={(v) => {
        if (v) onSelect(v === ALL ? null : (v as AudioTipo));
      }}
      aria-label="Filtrar por categoria"
      className="w-full justify-start overflow-x-auto scrollbar-none -mx-4 px-4 pr-6 pb-1"
    >
      {CHIPS.map((chip) => (
        <ToggleGroupItem
          key={chip.label}
          value={chip.value ?? ALL}
          className={PILL}
        >
          {chip.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
