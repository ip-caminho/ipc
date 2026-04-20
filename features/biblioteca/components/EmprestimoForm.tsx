"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ResponsiveSelect } from "@/shared/components/ui/responsive-select";
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

  const membroOptions = useMemo(
    () =>
      (membros ?? []).map((m: any) => ({
        value: m._id as string,
        label: (m.entidade?.nomeCompleto as string) || m._id,
      })),
    [membros],
  );

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Registrar emprestimo</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {disponiveis.length === 0 ? (
          <ResponsiveDialogBody>
            <p className="text-sm text-muted-foreground">
              Nenhum exemplar disponivel para emprestimo.
            </p>
          </ResponsiveDialogBody>
        ) : (
          <>
            <ResponsiveDialogBody className="space-y-4">
              <div>
                <Label>Exemplar</Label>
                <Select value={exemplarId} onValueChange={setExemplarId}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                <ResponsiveSelect
                  options={membroOptions}
                  value={membroId}
                  onValueChange={setMembroId}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar membro..."
                  emptyMessage="Nenhum membro encontrado"
                  title="Selecionar membro"
                />
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
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={salvando}>
                {salvando ? "Salvando..." : "Emprestar"}
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
