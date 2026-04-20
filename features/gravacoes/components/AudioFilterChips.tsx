"use client";

import { cn } from "@shared/lib/utils/cn";
import type { AudioTipo } from "@features/gravacoes/lib/categoryGradient";

type Chip = { value: AudioTipo | null; label: string };

const CHIPS: Chip[] = [
  { value: null, label: "Tudo" },
  { value: "SERMAO", label: "Pregações" },
  { value: "ESTUDO_BIBLICO", label: "Estudos" },
  { value: "PALESTRA", label: "Palestras" },
  { value: "OUTRO", label: "Outros" },
];

interface AudioFilterChipsProps {
  selected: AudioTipo | null;
  onSelect: (tipo: AudioTipo | null) => void;
}

export function AudioFilterChips({ selected, onSelect }: AudioFilterChipsProps) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pr-6 pb-1"
      role="tablist"
      aria-label="Filtrar por categoria"
    >
      {CHIPS.map((chip) => {
        const active = selected === chip.value;
        return (
          <button
            key={chip.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(chip.value)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors min-h-[32px] whitespace-nowrap",
              active
                ? "text-white"
                : "border text-foreground",
            )}
            style={active ? { backgroundColor: "#1a1a1a" } : undefined}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
