"use client";

import { Card, CardContent } from "@/shared/components/ui/card";

interface Stats {
  total: number;
  enviados: number;
  falhados: number;
  atualizaram: number;
  pendentes: number;
}

export function CampaignStats({ stats }: { stats: Stats }) {
  const taxaAtualizacao = stats.total > 0
    ? Math.round((stats.atualizaram / stats.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <StatCard label="Total" value={stats.total} />
      <StatCard label="Enviados" value={stats.enviados} accent="blue" />
      <StatCard label="Atualizaram" value={`${stats.atualizaram} (${taxaAtualizacao}%)`} accent="green" />
      <StatCard label="Falharam" value={stats.falhados} accent={stats.falhados > 0 ? "red" : "neutral"} />
      <StatCard label="Pendentes" value={stats.pendentes} accent="amber" />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: number | string;
  accent?: "blue" | "green" | "red" | "amber" | "neutral";
}) {
  const colorClass = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
    amber: "text-amber-700",
    neutral: "text-foreground",
  }[accent];

  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
