"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, parseISO, addDays, nextSunday, isSunday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/shared/lib/utils/cn";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";

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

function gerarDomingosFuturos(): string[] {
  const hoje = startOfDay(new Date());
  const limite = new Date(hoje.getFullYear(), 11, 31);
  const domingos: string[] = [];

  let dia = isSunday(hoje) ? hoje : nextSunday(hoje);
  while (dia <= limite) {
    domingos.push(format(dia, "yyyy-MM-dd"));
    dia = addDays(dia, 7);
  }
  return domingos;
}

interface DomingoData {
  data: string;
  funcoes: string[];
  indisponivel: boolean;
  escalado: boolean;
}

export function MinhaEscalaUnificada() {
  // @ts-ignore Convex TS2589
  const minhasEscalas = useQuery(api.escalas.queries.minhasEscalas);
  // @ts-ignore Convex TS2589
  const indisponibilidades = useQuery(api.escalas.disponibilidade.minhasIndisponibilidades, {});
  // @ts-ignore Convex TS2589
  const toggleIndisp = useMutation(api.escalas.disponibilidade.toggleIndisponibilidade);

  const [motivoData, setMotivoData] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const domingos = useMemo(() => gerarDomingosFuturos(), []);

  const dados = useMemo(() => {
    if (minhasEscalas === undefined || indisponibilidades === undefined) return null;

    const escalasMap = new Map<string, string[]>();
    for (const e of minhasEscalas) {
      const key = e.culto.data;
      if (!escalasMap.has(key)) escalasMap.set(key, []);
      escalasMap.get(key)!.push(e.funcao);
    }

    const indispSet = new Set((indisponibilidades || []).map((i: any) => i.data));

    return domingos.map((data): DomingoData => {
      const funcoes = escalasMap.get(data) || [];
      return {
        data,
        funcoes,
        escalado: funcoes.length > 0,
        indisponivel: indispSet.has(data),
      };
    });
  }, [minhasEscalas, indisponibilidades, domingos]);

  const handleToggle = async (data: string, escalado: boolean, indisponivel: boolean) => {
    if (escalado) return;

    // Marcando indisponível → pedir motivo
    if (!indisponivel) {
      setMotivoData(data);
      setMotivo("");
      return;
    }

    // Voltando a disponível → direto
    try {
      await toggleIndisp({ data });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleConfirmarMotivo = async () => {
    if (!motivoData || !motivo.trim()) return;
    setLoading(true);
    try {
      await toggleIndisp({ data: motivoData, motivo: motivo.trim() });
      setMotivoData(null);
      setMotivo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  if (dados === null) {
    return <Skeleton className="h-48" />;
  }

  // Agrupar por mês
  const porMes = new Map<string, DomingoData[]>();
  for (const d of dados) {
    const mes = d.data.slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes)!.push(d);
  }

  const motivoDataLabel = motivoData
    ? format(parseISO(motivoData), "dd 'de' MMMM", { locale: ptBR })
    : "";

  return (
    <>
      <div className="space-y-4">
        {Array.from(porMes.entries()).map(([mes, dias]) => {
          const mesLabel = format(parseISO(`${mes}-01`), "MMMM", { locale: ptBR });
          return (
            <div key={mes}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest capitalize">
                  {mesLabel}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex flex-col gap-1.5">
                {dias.map((dia) => {
                  const parsed = parseISO(dia.data);
                  const isProximo = dia === dados[0];

                  return (
                    <div
                      key={dia.data}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]",
                        dia.escalado && "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800",
                        dia.indisponivel && !dia.escalado && "bg-destructive/5 border border-destructive/20",
                        !dia.escalado && !dia.indisponivel && isProximo && "bg-muted border border-border",
                        !dia.escalado && !dia.indisponivel && !isProximo && "bg-muted/50",
                      )}
                    >
                      {/* Data */}
                      <div className="text-center min-w-[36px]">
                        <span className="text-base font-semibold leading-none block">
                          {format(parsed, "dd")}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {format(parsed, "EEE", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 flex flex-wrap items-center gap-1">
                        {dia.escalado ? (
                          dia.funcoes.map((funcao) => (
                            <span
                              key={funcao}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                FUNCAO_COLORS[funcao] || "bg-secondary text-secondary-foreground"
                              )}
                            >
                              {FUNCAO_LABELS[funcao] || funcao}
                            </span>
                          ))
                        ) : dia.indisponivel ? (
                          <span className="text-xs text-muted-foreground">Indisponível</span>
                        ) : null}
                      </div>

                      {/* Toggle / Lock */}
                      <div className="shrink-0">
                        {dia.escalado ? (
                          <Lock className="h-3.5 w-3.5 text-blue-400" />
                        ) : (
                          <Switch
                            size="sm"
                            checked={!dia.indisponivel}
                            onCheckedChange={() => handleToggle(dia.data, dia.escalado, dia.indisponivel)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer motivo */}
      <Drawer open={motivoData !== null} onOpenChange={(open) => !open && setMotivoData(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-base">
              Indisponível — {motivoDataLabel}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <Input
              placeholder="Motivo (ex: viagem, compromisso...)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleConfirmarMotivo()}
            />
            <Button
              className="w-full min-h-[48px]"
              disabled={loading || !motivo.trim()}
              onClick={handleConfirmarMotivo}
            >
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
