"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Progress } from "@shared/components/ui/progress";
import { cn } from "@shared/lib/utils/cn";

export function ProfileCompletenessCard() {
  const data = useQuery(api.membros.cadastroVivo.getMyCompleteness);

  if (data === undefined || data === null) return null;
  if (data.percentage === 100 && !data.isStale) return null;

  const color =
    data.percentage > 80
      ? "text-emerald-600 dark:text-emerald-400"
      : data.percentage >= 50
        ? "text-amber-600 dark:text-amber-500"
        : "text-red-600 dark:text-red-400";

  const progressColor =
    data.percentage > 80
      ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
      : data.percentage >= 50
        ? "[&_[data-slot=progress-indicator]]:bg-amber-500"
        : "[&_[data-slot=progress-indicator]]:bg-red-500";

  const Icon = data.percentage === 100 ? CheckCircle2 : AlertCircle;
  const maxShow = 3;
  const shown = data.missing.slice(0, maxShow);
  const remaining = data.missing.length - maxShow;

  return (
    <Link
      href="/meu-perfil"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 active:opacity-80 transition-opacity"
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5 shrink-0", color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Seu perfil esta {data.percentage}% completo
          </p>
          {data.isStale && data.percentage === 100 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirme seus dados — ultima atualizacao ha mais de 6 meses
            </p>
          )}
        </div>
      </div>

      <Progress value={data.percentage} className={cn("h-2", progressColor)} />

      {shown.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Faltam: {shown.map((f: { key: string; label: string }) => f.label).join(", ")}
          {remaining > 0 && ` e mais ${remaining}`}
        </p>
      )}
    </Link>
  );
}
