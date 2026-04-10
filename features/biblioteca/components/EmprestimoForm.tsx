"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";

interface EmprestimoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exemplares: Array<{ _id: string; codigo: string; status: string; condicao: string }>;
}

export function EmprestimoForm({ open, onOpenChange, exemplares }: EmprestimoFormProps) {
  const emprestar = useMutation(api.biblioteca.mutations.emprestar);
  // @ts-expect-error Convex TS2589
  const membros = useQuery(api.membros.queries.list);

  const disponiveis = exemplares.filter((e) => e.status === "DISPONIVEL");
  const [exemplarId, setExemplarId] = useState<string>(disponiveis[0]?._id || "");
  const [membroId, setMembroId] = useState<string>("");
  const [dias, setDias] = useState(14);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit() {
    if (!exemplarId || !membroId) {
      toast.error("Selecione exemplar e membro");
      return;
    }
    setSalvando(true);
    try {
      await emprestar({
        exemplarId: exemplarId as Id<"exemplares">,
        membroId: membroId as Id<"membros">,
        diasEmprestimo: dias,
      });
      toast.success("Emprestimo registrado");
      onOpenChange(false);
      setMembroId("");
      setDias(14);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setSalvando(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar emprestimo</DialogTitle>
        </DialogHeader>

        {disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum exemplar disponivel para emprestimo.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Exemplar</Label>
              <Select value={exemplarId} onValueChange={setExemplarId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {disponiveis.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.codigo} ({e.condicao})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Membro</Label>
              <Select value={membroId} onValueChange={setMembroId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {membros?.map((m: any) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.entidade?.nomeCompleto || m._id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dias de emprestimo</Label>
              <Input
                type="number"
                value={dias}
                onChange={(e) => setDias(parseInt(e.target.value) || 14)}
                min={1}
                max={90}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={salvando}>
                {salvando ? "Salvando..." : "Emprestar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
