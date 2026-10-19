"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BarChart3, Clock, Music } from "lucide-react";

const PERIODOS = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
  { value: undefined, label: "Todos" },
] as const;

export default function MetricasLouvorPage() {
  const [meses, setMeses] = useState<number | undefined>(6);

  // @ts-ignore Convex TS2589
  const frequencia = useQuery(api.louvor.metricas.louvorFrequencia, { meses });
  // @ts-ignore Convex TS2589
  const naoTocados = useQuery(api.louvor.metricas.louvoresNaoTocados, { meses: meses || 3 });

  const maxVezes = frequencia?.[0]?.vezes || 1;

  return (
    <div className="space-y-6">
      <DetailHeader backHref="/louvor" title="Métricas do Louvor" />

      {/* Filtro de periodo */}
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(meses ?? "todos")}
        onValueChange={(v) => {
          if (v) setMeses(v === "todos" ? undefined : Number(v));
        }}
        className="w-full md:w-auto"
      >
        {PERIODOS.map((p) => (
          <ToggleGroupItem
            key={p.label}
            value={String(p.value ?? "todos")}
            className="h-10 md:h-8 flex-1 md:flex-none px-3 text-sm"
          >
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
        {/* Mais tocadas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Mais tocadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!frequencia ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : frequencia.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {frequencia.slice(0, 20).map((item, i) => (
                  <div key={item.louvorId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate text-sm">{item.titulo}</span>
                        {item.tom && (
                          <Badge variant="outline" className="text-[10px] h-4 shrink-0">{item.tom}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(item.vezes / maxVezes) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {item.vezes}x
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Não tocadas recentemente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Nao tocadas recentemente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!naoTocados ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : naoTocados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Todas as musicas tocaram recentemente</p>
            ) : (
              <div className="space-y-2">
                {naoTocados.slice(0, 20).map((item) => (
                  <div key={item.louvorId} className="flex min-w-0 items-center gap-2 py-1">
                    <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{item.titulo}</span>
                      {item.artista && (
                        <span className="block truncate text-xs text-muted-foreground">{item.artista}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {item.ultimaVez || "Nunca tocou"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
