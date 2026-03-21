"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Baby } from "lucide-react";
import { TURMA_COLORS } from "../lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function EducacionalPaisWidget() {
  const criancas = useQuery(api.educacional.queries.dashboardPais);

  // Nao renderiza se nao e pai/mae ou dados nao carregaram
  if (criancas === undefined || criancas === null) return null;

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Baby className="h-4 w-4" />
          Educacional Infantil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {criancas.map((c: any, i: number) => {
            const turmaColor = TURMA_COLORS[c.turma] || "bg-gray-100 text-gray-800";
            return (
              <li key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.nome}</span>
                  <Badge variant="secondary" className={turmaColor}>
                    Turma {c.turma}
                  </Badge>
                </div>
                {c.proximaEscalaData && c.professores.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Proxima aula ({format(parseISO(c.proximaEscalaData), "dd/MM", { locale: ptBR })}): {c.professores.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
