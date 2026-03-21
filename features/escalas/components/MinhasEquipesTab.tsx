"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils/cn";

const FUNCAO_LABELS: Record<string, string> = {
  ABERTURA: "Abertura",
  CONFISSAO: "Confissão",
  PREGACAO: "Pregação",
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimídia",
};

const FUNCAO_COLORS: Record<string, string> = {
  LOUVOR: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  HOSPITALIDADE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  SOM: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MULTIMIDIA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ABERTURA: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  CONFISSAO: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  PREGACAO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface EscalaItem {
  _id: string;
  funcao: string;
  culto: { data: string; horario?: string; tipo: string };
}

interface DiaEscala {
  data: string;
  horario?: string;
  funcoes: string[];
}

function agruparPorData(escalas: EscalaItem[]): DiaEscala[] {
  const map = new Map<string, DiaEscala>();
  for (const e of escalas) {
    const key = e.culto.data;
    if (!map.has(key)) {
      map.set(key, { data: key, horario: e.culto.horario, funcoes: [] });
    }
    map.get(key)!.funcoes.push(e.funcao);
  }
  return Array.from(map.values());
}

function agruparPorMes(dias: DiaEscala[]): Map<string, DiaEscala[]> {
  const grupos = new Map<string, DiaEscala[]>();
  for (const d of dias) {
    const mes = d.data.slice(0, 7);
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes)!.push(d);
  }
  return grupos;
}

export function MinhasEquipesTab() {
  // @ts-ignore Convex TS2589
  const minhasEscalas = useQuery(api.escalas.queries.minhasEscalas);

  if (minhasEscalas === undefined) {
    return <Skeleton className="h-64" />;
  }

  if (minhasEscalas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma escala futura encontrada.</p>
        <p className="text-sm mt-1">Quando você for escalado, suas datas aparecerão aqui.</p>
      </div>
    );
  }

  const dias = agruparPorData(minhasEscalas);
  const porMes = agruparPorMes(dias);

  return (
    <div className="space-y-6 max-w-2xl">
      {Array.from(porMes.entries()).map(([mes, diasMes]) => {
        const mesLabel = format(parseISO(`${mes}-01`), "MMMM yyyy", { locale: ptBR });
        return (
          <div key={mes}>
            <h3 className="text-sm font-semibold capitalize mb-2">{mesLabel}</h3>
            <div className="space-y-2">
              {diasMes.map((dia) => {
                const parsed = parseISO(dia.data);
                return (
                  <Card key={dia.data}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        <p className="text-2xl font-bold leading-none">
                          {format(parsed, "dd")}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                          {format(parsed, "EEE", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="flex-1 flex flex-wrap items-center gap-1.5">
                        {dia.funcoes.map((funcao) => (
                          <Badge
                            key={funcao}
                            className={cn(
                              "text-xs border-0",
                              FUNCAO_COLORS[funcao] || "bg-secondary"
                            )}
                          >
                            {FUNCAO_LABELS[funcao] || funcao}
                          </Badge>
                        ))}
                        {dia.horario && (
                          <span className="text-xs text-muted-foreground">
                            {dia.horario}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
