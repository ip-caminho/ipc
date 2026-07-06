"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { PiggyBank, Plus } from "lucide-react";
import { brl, parseReais } from "../lib/format";

// Painel financeiro consolidado do evento + fundo solidario com aporte avulso.
export function FundoEventoCard({ acampamentoId }: { acampamentoId: Id<"acampamentos"> }) {
  // @ts-ignore Convex TS2589
  const resumo = useQuery(api.acampamento.queries.resumoFinanceiro, { id: acampamentoId });
  const aportar = useMutation(api.acampamento.mutations.aportarFundo);
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  if (resumo === undefined) return <Skeleton className="h-24 w-full" />;
  if (resumo === null) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {[
          ["Tabela", brl(resumo.totalTabela)],
          ["Descontos", `−${brl(resumo.totalDescontos)}`],
          ["A cobrar", brl(resumo.totalFinal)],
          ["Recebido", brl(resumo.totalRecebido)],
          ["A receber", brl(resumo.aReceber)],
        ].map(([label, v]) => (
          <div key={label} className="rounded-md border p-3">
            <p className="truncate text-sm font-semibold tabular-nums">{v}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
        <div
          className={`rounded-md border p-3 ${
            resumo.fundo < 0
              ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
              : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          }`}
        >
          <p className="flex items-center gap-1 truncate text-sm font-semibold tabular-nums">
            <PiggyBank className="h-4 w-4 shrink-0" /> {brl(resumo.fundo)}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-0.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Fundo solidário · aportar
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aporte avulso no fundo solidário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Entrada sem vínculo com inscrição: doação de alguém que não vai, verba da igreja etc.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="aporte-valor">Valor (R$)</Label>
              <Input
                id="aporte-valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aporte-desc">Origem</Label>
              <Input
                id="aporte-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: doação anônima, verba de missões"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await aportar({ id: acampamentoId, valor: parseReais(valor), descricao });
                    toast.success("Aporte registrado no fundo");
                    setOpen(false);
                    setValor("");
                    setDescricao("");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro ao aportar");
                  }
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Aportar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
