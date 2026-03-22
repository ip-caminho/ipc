"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Baby } from "lucide-react";
import { TURMA_COLORS } from "../lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function EducacionalPaisWidget() {
  const criancas = useQuery(api.educacional.queries.dashboardPais);

  // Nao renderiza se nao e pai/mae ou dados nao carregaram
  if (criancas === undefined || criancas === null) return null;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Baby size={13} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Educacional Infantil</span>
      </div>
      <div className="flex flex-col gap-2">
        {criancas.map((c: any, i: number) => {
          const turmaColor = TURMA_COLORS[c.turma] || "bg-gray-100 text-gray-800";
          return (
            <div key={i} className="bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{c.nome}</span>
                <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${turmaColor}`}>
                  Turma {c.turma}
                </span>
              </div>
              {c.proximaEscalaData && c.professores.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Proxima aula ({format(parseISO(c.proximaEscalaData), "dd/MM", { locale: ptBR })}): {c.professores.join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
