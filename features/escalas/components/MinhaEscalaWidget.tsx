"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CalendarCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils/cn";
import { useMemo } from "react";

const FUNCAO_LABELS: Record<string, string> = {
  ABERTURA: "Abertura",
  CONFISSAO: "Confissão",
  PREGACAO: "Pregação",
  ORACAO: "Oração",
  AVISOS: "Avisos",
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
  ORACAO: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  AVISOS: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
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

interface MesGroup {
  label: string;
  dias: DiaEscala[];
}

function agruparPorMes(escalas: EscalaItem[]): MesGroup[] {
  const limite = `${new Date().getFullYear()}-12-31`;

  const diasMap = new Map<string, DiaEscala>();
  for (const e of escalas) {
    if (e.culto.data > limite) continue;
    const key = e.culto.data;
    if (!diasMap.has(key)) {
      diasMap.set(key, { data: key, horario: e.culto.horario, funcoes: [] });
    }
    diasMap.get(key)!.funcoes.push(e.funcao);
  }

  const mesesMap = new Map<string, MesGroup>();
  for (const dia of diasMap.values()) {
    const parsed = parseISO(dia.data);
    const mesKey = format(parsed, "yyyy-MM");
    if (!mesesMap.has(mesKey)) {
      mesesMap.set(mesKey, {
        label: format(parsed, "MMMM", { locale: ptBR }),
        dias: [],
      });
    }
    mesesMap.get(mesKey)!.dias.push(dia);
  }

  return Array.from(mesesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => group);
}

export function MinhaEscalaWidget() {
  // @ts-ignore Convex TS2589
  const minhasEscalas = useQuery(api.escalas.queries.minhasEscalas);

  const meses = useMemo(() => {
    if (!minhasEscalas || minhasEscalas.length === 0) return [];
    return agruparPorMes(minhasEscalas);
  }, [minhasEscalas]);

  if (minhasEscalas === undefined) return null;
  if (meses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma escala até o final do ano
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {meses.map((mes) => (
        <div key={mes.label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest capitalize">
              {mes.label}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-col gap-1.5">
            {mes.dias.map((dia) => {
              const parsed = parseISO(dia.data);
              const isProximo = dia.data === meses[0]?.dias[0]?.data;
              return (
                <div
                  key={dia.data}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg",
                    isProximo ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" : "bg-muted",
                  )}
                >
                  <div className="text-center min-w-[32px]">
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground block">
                      DIA
                    </span>
                    <span className="text-base font-medium leading-none block">
                      {format(parsed, "dd")}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-wrap items-center gap-1">
                    {dia.funcoes.map((funcao) => (
                      <span
                        key={funcao}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          FUNCAO_COLORS[funcao] || "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {FUNCAO_LABELS[funcao] || funcao}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
