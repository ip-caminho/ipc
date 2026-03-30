"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CalendarCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils/cn";
import Link from "next/link";

const FUNCAO_LABELS: Record<string, string> = {
  ABERTURA: "Abertura",
  CONFISSAO: "Confissao",
  PREGACAO: "Pregacao",
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimidia",
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

const MAX_DIAS = 4;

export function MinhaEscalaWidget() {
  // @ts-ignore Convex TS2589
  const minhasEscalas = useQuery(api.escalas.queries.minhasEscalas);

  // Nao renderiza se nao carregou ou nao tem escalas
  if (minhasEscalas === undefined || minhasEscalas.length === 0) return null;

  const dias = agruparPorData(minhasEscalas);
  const diasVisiveis = dias.slice(0, MAX_DIAS);
  const temMais = dias.length > MAX_DIAS;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck size={13} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Minha Escala</span>
        </div>
        <span className="text-xs text-muted-foreground">Próximas</span>
      </div>
      <div className="flex flex-col gap-2">
        {diasVisiveis.map((dia) => {
          const parsed = parseISO(dia.data);
          return (
            <div key={dia.data} className="flex items-center gap-3 px-2 py-1.5 bg-muted rounded-lg">
              <div className="text-center min-w-[28px]">
                <span className="text-base font-medium leading-none block">
                  {format(parsed, "dd")}
                </span>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {format(parsed, "EEE", { locale: ptBR })}
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
      {temMais && (
        <Link
          href="/escalas"
          className="text-xs text-muted-foreground underline underline-offset-2 mt-2 block transition-colors duration-150 hover:text-foreground"
        >
          Ver todas as escalas
        </Link>
      )}
    </div>
  );
}
