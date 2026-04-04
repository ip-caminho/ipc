"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BarChart3, Clock, Music } from "lucide-react";
import Link from "next/link";

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Metricas do Louvor</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/louvor">Repertorio</Link>
        </Button>
      </div>

      {/* Filtro de periodo */}
      <div className="flex items-center gap-1">
        {PERIODOS.map((p) => (
          <Button
            key={p.label}
            variant={meses === p.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMeses(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate">{item.titulo}</span>
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
                  <div key={item.louvorId} className="flex items-center gap-2 py-1">
                    <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{item.titulo}</span>
                      {item.artista && (
                        <span className="text-xs text-muted-foreground">{item.artista}</span>
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
