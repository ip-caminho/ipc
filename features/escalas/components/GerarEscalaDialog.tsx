"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Wand2, Check, X, AlertTriangle, Mic } from "lucide-react";
import { format, parseISO, addWeeks, endOfMonth, addMonths, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/shared/lib/utils/cn";

interface GerarEscalaDialogProps {
  funcao: string;
  label: string;
  qtd: number;
}

function getPeriodos(): Array<{ value: string; label: string; dataFim: string }> {
  const hoje = new Date();
  const hojeStr = format(hoje, "yyyy-MM-dd");

  return [
    {
      value: "4sem",
      label: "Próximas 4 semanas",
      dataFim: format(addWeeks(hoje, 4), "yyyy-MM-dd"),
    },
    {
      value: "8sem",
      label: "Próximas 8 semanas",
      dataFim: format(addWeeks(hoje, 8), "yyyy-MM-dd"),
    },
    {
      value: "fim-mes",
      label: `Até fim de ${format(hoje, "MMMM", { locale: ptBR })}`,
      dataFim: format(endOfMonth(hoje), "yyyy-MM-dd"),
    },
    {
      value: "prox-mes",
      label: `Até fim de ${format(addMonths(hoje, 1), "MMMM", { locale: ptBR })}`,
      dataFim: format(endOfMonth(addMonths(hoje, 1)), "yyyy-MM-dd"),
    },
    {
      value: "fim-ano",
      label: "Até fim do ano",
      dataFim: format(endOfYear(hoje), "yyyy-MM-dd"),
    },
  ];
}

export function GerarEscalaDialog({ funcao, label, qtd }: GerarEscalaDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Gerar Escala
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Escala — {label}</DialogTitle>
          <DialogDescription>
            {qtd} membro{qtd > 1 ? "s" : ""} por culto. Selecione o período e confirme.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <GerarContent funcao={funcao} qtd={qtd} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GerarContent({
  funcao,
  qtd,
  onClose,
}: {
  funcao: string;
  qtd: number;
  onClose: () => void;
}) {
  const periodos = getPeriodos();
  const [periodoSelecionado, setPeriodoSelecionado] = useState(periodos[0].value);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const periodo = periodos.find((p) => p.value === periodoSelecionado)!;
  const hoje = format(new Date(), "yyyy-MM-dd");

  // @ts-ignore Convex TS2589
  const equipes = useQuery(api.escalas.equipes.listEquipes);
  // @ts-ignore Convex TS2589
  const proximosCultos = useQuery(api.escalas.queries.listProximosCultos, { limit: 52 });
  // @ts-ignore Convex TS2589
  const gerarMutation = useMutation(api.escalas.gerarEscala.gerarEscalaPorEquipe);

  const membrosEquipe = equipes?.[funcao]?.filter((m: any) => m.ativo) || [];
  const cultosNoPeriodo = (proximosCultos || []).filter(
    (c: any) => c.data >= hoje && c.data <= periodo.dataFim
  );

  const handleGerar = async () => {
    setSalvando(true);
    try {
      const result = await gerarMutation({
        funcao,
        dataInicio: hoje,
        dataFim: periodo.dataFim,
      });
      setResultado(result);
      if (result.alertas?.length > 0) {
        toast.warning(`${result.alertas.length} culto(s) sem condutor disponível`);
      } else {
        toast.success(`${result.totalAtribuidos} atribuições geradas para ${result.cultosProcessados} cultos`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar escalas");
    } finally {
      setSalvando(false);
    }
  };

  if (!equipes || !proximosCultos) {
    return <Skeleton className="h-48" />;
  }

  return (
    <div className="space-y-4">
      {/* Período */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Período</label>
        <Select value={periodoSelecionado} onValueChange={(v) => { setPeriodoSelecionado(v); setResultado(null); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodos.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Cultos: </span>
          <span className="font-medium">{cultosNoPeriodo.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Membros: </span>
          <span className="font-medium">{membrosEquipe.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Por culto: </span>
          <span className="font-medium">{qtd}</span>
        </div>
      </div>

      {/* Membros da equipe */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Membros da equipe</p>
        <div className="flex flex-wrap gap-1">
          {membrosEquipe.map((m: any) => (
            <Badge
              key={m.membroId}
              variant="secondary"
              className={`text-xs ${m.condutor ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : ""}`}
            >
              {m.condutor && <Mic className="h-2.5 w-2.5 mr-0.5" />}
              {m.nomeCompleto.split(" ")[0]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Cultos no período */}
      {cultosNoPeriodo.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum culto cadastrado neste período.
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Cultos no período</p>
          <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
            {cultosNoPeriodo.map((culto: any) => {
              const parsed = parseISO(culto.data);
              const escalasFunc = (culto.escalas || []).filter((e: any) => e.funcao === funcao);
              const temEscala = escalasFunc.some((e: any) => e.membroNome);
              const resultadoCulto = resultado?.detalhes?.find((d: any) => d.data === culto.data);

              return (
                <div key={culto._id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span className="font-medium capitalize min-w-[80px]">
                    {format(parsed, "dd/MM (EEE)", { locale: ptBR })}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {temEscala ? (
                      escalasFunc
                        .filter((e: any) => e.membroNome)
                        .map((e: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {e.membroNome}
                          </Badge>
                        ))
                    ) : resultadoCulto?.alertaSemCondutor ? (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Sem condutor
                      </Badge>
                    ) : resultadoCulto && resultadoCulto.atribuidos.length > 0 ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        {resultadoCulto.atribuidos.length} gerado{resultadoCulto.atribuidos.length > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resultado?.alertas?.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {resultado.alertas.length} culto{resultado.alertas.length > 1 ? "s" : ""} sem condutor disponível
            </p>
            <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">
              Nenhum condutor de louvor está disponível nestas datas. Atribua manualmente ou verifique as indisponibilidades.
            </p>
          </div>
        </div>
      )}

      <DialogFooter>
        {resultado ? (
          <Button size="sm" onClick={onClose}>
            Fechar
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleGerar}
            disabled={salvando || cultosNoPeriodo.length === 0 || membrosEquipe.length === 0}
          >
            {salvando ? "Gerando..." : (
              <>
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                Gerar para {cultosNoPeriodo.length} culto{cultosNoPeriodo.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
