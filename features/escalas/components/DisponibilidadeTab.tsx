"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Check, X, Lock } from "lucide-react";
import { format, parseISO, addDays, nextSunday, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils/cn";

function getDomingosAteFinDoAno(): string[] {
  const datas: string[] = [];
  const hoje = new Date();
  const fim = endOfYear(hoje);
  let proximo = hoje.getDay() === 0 ? hoje : nextSunday(hoje);

  while (proximo <= fim) {
    datas.push(format(proximo, "yyyy-MM-dd"));
    proximo = addDays(proximo, 7);
  }

  return datas;
}

function agruparPorMes(datas: string[]): Map<string, string[]> {
  const grupos = new Map<string, string[]>();
  for (const data of datas) {
    const mes = data.slice(0, 7); // YYYY-MM
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes)!.push(data);
  }
  return grupos;
}

const FUNCAO_LABELS: Record<string, string> = {
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimídia",
};

export function DisponibilidadeTab() {
  // @ts-ignore Convex TS2589
  const minhasEquipes = useQuery(api.escalas.equipes.listMinhasEquipes);
  // @ts-ignore Convex TS2589
  const indisponibilidades = useQuery(api.escalas.disponibilidade.minhasIndisponibilidades, {});
  // @ts-ignore Convex TS2589
  const datasEscaladas = useQuery(api.escalas.disponibilidade.minhasDatasEscaladas);
  // @ts-ignore Convex TS2589
  const toggleIndisp = useMutation(api.escalas.disponibilidade.toggleIndisponibilidade);

  const domingos = getDomingosAteFinDoAno();
  const porMes = agruparPorMes(domingos);
  const indispDatas = new Set((indisponibilidades || []).map((i: any) => i.data));
  const escaladaDatas = new Set(datasEscaladas || []);

  const handleToggle = async (data: string) => {
    if (escaladaDatas.has(data)) {
      toast.error("Você já está escalado nesta data. Solicite ao coordenador para alterar.");
      return;
    }
    try {
      const result = await toggleIndisp({ data });
      if (result.action === "added") {
        toast.success("Marcado como indisponível");
      } else {
        toast.success("Marcado como disponível");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (minhasEquipes === undefined || indisponibilidades === undefined || datasEscaladas === undefined) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-4">
      {minhasEquipes.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {minhasEquipes.map((funcao: string) => (
            <Badge key={funcao} variant="secondary" className="text-xs">
              {FUNCAO_LABELS[funcao] || funcao}
            </Badge>
          ))}
        </div>
      )}

      {minhasEquipes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Você ainda não faz parte de nenhuma equipe de escala.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Você é considerado <strong>disponível</strong> por padrão. Marque apenas os domingos em que <strong>não pode</strong> servir.
      </p>

      <div className="space-y-6">
        {Array.from(porMes.entries()).map(([mes, datas]) => {
          const mesLabel = format(parseISO(`${mes}-01`), "MMMM", { locale: ptBR });
          return (
            <div key={mes}>
              <h3 className="text-sm font-semibold capitalize mb-2">{mesLabel}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {datas.map((data) => {
                  const indisponivel = indispDatas.has(data);
                  const escalado = escaladaDatas.has(data);
                  const parsed = parseISO(data);
                  return (
                    <Card
                      key={data}
                      className={cn(
                        "transition-colors",
                        escalado
                          ? "border-blue-500/50 bg-blue-500/5 cursor-not-allowed"
                          : "cursor-pointer",
                        !escalado && indisponivel
                          ? "border-destructive/50 bg-destructive/5"
                          : "",
                        !escalado && !indisponivel
                          ? "border-green-500/30 bg-green-500/5"
                          : ""
                      )}
                      onClick={() => handleToggle(data)}
                    >
                      <CardContent className="p-2 text-center">
                        <p className="text-sm font-bold">
                          {format(parsed, "dd", { locale: ptBR })}
                        </p>
                        <div className="mt-1 flex justify-center">
                          {escalado ? (
                            <Lock className="h-3.5 w-3.5 text-blue-600" />
                          ) : indisponivel ? (
                            <X className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </div>
                        {escalado && (
                          <p className="text-[9px] text-blue-600 mt-0.5">Escalado</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
