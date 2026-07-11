"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { domingosDoMes } from "../lib/escala";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface EscalaMesGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ministerioId: Id<"ministerios">;
}

export function EscalaMesGenerator({
  open,
  onOpenChange,
  ministerioId,
}: EscalaMesGeneratorProps) {
  const gerar = useMutation(api.educacional.mutations.gerarEscalaMes);
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const domingos = domingosDoMes(ano, mes);
  const anos = [now.getFullYear(), now.getFullYear() + 1];

  async function handleGerar() {
    setLoading(true);
    try {
      const res = await gerar({ ministerioId, ano, mes });
      if (res.criados === 0) {
        toast.info("Todos os domingos deste mês já existem");
      } else {
        toast.success(
          `${res.criados} domingo(s) criado(s) de ${res.total}`
        );
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.data ?? e?.message ?? "Erro ao gerar escala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Gerar domingos do mês</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mês</Label>
              <Select
                value={String(mes)}
                onValueChange={(v) => setMes(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((nome, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ano</Label>
              <Select
                value={String(ano)}
                onValueChange={(v) => setAno(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Serão criados <strong>{domingos.length} domingos</strong> em branco
            (turmas vazias). Domingos que já têm escala são mantidos.
          </p>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={loading} onClick={handleGerar}>
            {loading ? "Gerando..." : "Gerar"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
