"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface Props {
  totalMembros: number;
  completosCount: number;
  completosPercent: number;
  atualizadosCount: number;
  atualizadosPercent: number;
  avgCompleteness: number;
}

export function VitalityStats({
  totalMembros,
  completosCount,
  completosPercent,
  atualizadosCount,
  atualizadosPercent,
  avgCompleteness,
}: Props) {
  const stats = [
    {
      label: "Membros ativos",
      value: totalMembros,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Cadastro completo",
      value: `${completosCount} (${completosPercent}%)`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Atualizado (6m)",
      value: `${atualizadosCount} (${atualizadosPercent}%)`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-500",
    },
    {
      label: "Completude media",
      value: `${avgCompleteness}%`,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
