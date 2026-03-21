"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Users, Mic, AlertTriangle } from "lucide-react";
import { GerarEscalaDialog } from "@features/escalas/components/GerarEscalaDialog";
import { useFuncoes } from "@features/escalas/hooks/useFuncoes";

export function GerarEscalasTab() {
  // @ts-ignore Convex TS2589
  const equipes = useQuery(api.escalas.equipes.listEquipes);
  const funcoes = useFuncoes();

  const funcoesEquipe = (funcoes || []).filter((f: any) => f.temEquipe);

  if (equipes === undefined || funcoes === undefined) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Selecione uma equipe e o período para gerar as escalas automaticamente. O algoritmo distribui de forma justa, respeitando indisponibilidades.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {funcoesEquipe.map((config: any) => {
          const membros = equipes[config.slug] || [];
          const ativos = membros.filter((m: any) => m.ativo);
          const qtd = config.qtdPorCulto || 1;

          return (
            <Card key={config.slug}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{config.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {ativos.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ativos.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhum membro ativo</div>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">
                      {qtd} por culto
                    </div>
                    {config.slug === "LOUVOR" && (() => {
                      const condutores = ativos.filter((m: any) => m.condutor);
                      const acompanhantes = ativos.filter((m: any) => !m.condutor);
                      return (
                        <div className="flex gap-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Mic className="h-3 w-3 text-amber-600" />
                            {condutores.length} condutor{condutores.length !== 1 ? "es" : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {acompanhantes.length} acompanha{acompanhantes.length !== 1 ? "m" : ""}
                          </span>
                          {condutores.length === 0 && (
                            <span className="flex items-center gap-0.5 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              sem condutor
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <GerarEscalaDialog funcao={config.slug} label={config.label} qtd={qtd} />
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
