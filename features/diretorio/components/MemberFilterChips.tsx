"use client";

import { cn } from "@shared/lib/utils/cn";

export type FilterValue = "todos" | "membros" | "obreiros" | "lideranca" | "criancas";

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "membros", label: "Membros" },
  { value: "obreiros", label: "Obreiros" },
  { value: "lideranca", label: "Liderança" },
  { value: "criancas", label: "Crianças" },
];

interface Props {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

export function MemberFilterChips({ value, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
      {FILTERS.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "shrink-0 h-8 px-3 text-xs font-medium rounded-full transition-colors border",
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-secondary text-muted-foreground border-border",
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
