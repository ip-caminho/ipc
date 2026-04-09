"use client";

import { Badge } from "@/shared/components/ui/badge";
import { STATUS_OPTIONS } from "../lib/constants";

export function TarefaStatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <Badge variant="outline" className={opt?.color ?? ""}>
      {opt?.label ?? status}
    </Badge>
  );
}
