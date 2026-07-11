"use client";

import { cn } from "@/shared/lib/utils/cn";
import { TURMA_OPTIONS, TURMA_COLORS } from "../lib/constants";

interface TurmaFilterChipsProps {
  value: string; // "all" ou o valor da turma
  onChange: (value: string) => void;
  counts: Record<string, number>;
  total: number;
}

// Chip de filtro por turma com contagem. Substitui o Select — alvos de toque
// grandes (h-10) e cor da turma, melhor no mobile.
export function TurmaFilterChips({
  value,
  onChange,
  counts,
  total,
}: TurmaFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
          value === "all"
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-background hover:bg-muted"
        )}
      >
        Todas
        <span className="text-xs opacity-80">{total}</span>
      </button>
      {TURMA_OPTIONS.map((turma) => {
        const selected = value === turma.value;
        const count = counts[turma.value] ?? 0;
        return (
          <button
            key={turma.value}
            type="button"
            onClick={() => onChange(turma.value)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : cn("bg-background hover:bg-muted", TURMA_COLORS[turma.value])
            )}
          >
            {turma.value}
            <span className="text-xs opacity-80">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
