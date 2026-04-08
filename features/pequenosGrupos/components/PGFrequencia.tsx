"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

interface PGFrequenciaProps {
  pgId: Id<"pequenosGrupos">;
}

function getFrequenciaCor(percentual: number): string {
  if (percentual >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (percentual >= 50) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

export function PGFrequencia({ pgId }: PGFrequenciaProps) {
  // @ts-ignore Convex TS2589
  const resumo = useQuery(api.pequenosGrupos.queries.getFrequenciaResumo, { pgId });

  if (resumo === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!resumo || resumo.totalEncontros === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum encontro registrado</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Frequencia — {resumo.totalEncontros} encontro{resumo.totalEncontros > 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {resumo.membros.map((m: any) => (
            <div key={m.membroId} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-sm flex-1 min-w-0 truncate">{m.nome}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {m.presencas}/{resumo.totalEncontros}
                </span>
                <Badge className={getFrequenciaCor(m.percentual)}>
                  {m.percentual}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
