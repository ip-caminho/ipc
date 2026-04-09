"use client";

import { Badge } from "@/shared/components/ui/badge";
import { PRIORIDADE_OPTIONS } from "../lib/constants";

export function TarefaPrioridadeBadge({ prioridade }: { prioridade: string }) {
  const opt = PRIORIDADE_OPTIONS.find((p) => p.value === prioridade);
  return (
    <Badge variant="outline" className={opt?.color ?? ""}>
      {opt?.label ?? prioridade}
    </Badge>
  );
}
