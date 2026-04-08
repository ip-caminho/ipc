"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";

interface PGEncontroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pgId: Id<"pequenosGrupos">;
  membros: Array<{ _id: string; membroId: string; nome: string }>;
  editingEncontroId: Id<"pgEncontros"> | null;
}

export function PGEncontroForm({ open, onOpenChange, pgId, membros, editingEncontroId }: PGEncontroFormProps) {
  const createEncontro = useMutation(api.pequenosGrupos.mutations.createEncontro);
  const updateEncontro = useMutation(api.pequenosGrupos.mutations.updateEncontroPresencas);
  // @ts-ignore Convex TS2589
  const encontroData = useQuery(
    api.pequenosGrupos.queries.getEncontroPresencas,
    editingEncontroId ? { encontroId: editingEncontroId } : "skip"
  );

  const [data, setData] = useState("");
  const [tema, setTema] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Preencher form ao editar
  useEffect(() => {
    if (editingEncontroId && encontroData) {
      setData(encontroData.data);
      setTema(encontroData.tema || "");
      setObservacoes(encontroData.observacoes || "");
      setPresentes(new Set(
        encontroData.membros
          .filter((m: any) => m.presente)
          .map((m: any) => m.membroId)
      ));
    } else if (!editingEncontroId) {
      setData(new Date().toISOString().split("T")[0]);
      setTema("");
      setObservacoes("");
      setPresentes(new Set());
    }
  }, [editingEncontroId, encontroData]);

  const togglePresenca = (membroId: string) => {
    setPresentes((prev) => {
      const next = new Set(prev);
      if (next.has(membroId)) {
        next.delete(membroId);
      } else {
        next.add(membroId);
      }
      return next;
    });
  };

  const toggleTodos = () => {
    if (presentes.size === membros.length) {
      setPresentes(new Set());
    } else {
      setPresentes(new Set(membros.map((m) => m.membroId)));
    }
  };

  const handleSubmit = async () => {
    if (!data) {
      toast.error("Informe a data do encontro");
      return;
    }
    setSaving(true);
    try {
      const presentesArray = Array.from(presentes) as Id<"membros">[];
      if (editingEncontroId) {
        await updateEncontro({
          encontroId: editingEncontroId,
          data,
          tema: tema || undefined,
          observacoes: observacoes || undefined,
          presentes: presentesArray,
        });
        toast.success("Encontro atualizado");
      } else {
        await createEncontro({
          pgId,
          data,
          tema: tema || undefined,
          observacoes: observacoes || undefined,
          presentes: presentesArray,
        });
        toast.success("Encontro registrado");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editingEncontroId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar encontro" : "Novo encontro"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Tema</Label>
            <Input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Tema do encontro" />
          </div>

          <div className="space-y-1">
            <Label>Observacoes</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observacoes" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Presenca ({presentes.size}/{membros.length})</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleTodos}>
                {presentes.size === membros.length ? "Desmarcar todos" : "Marcar todos"}
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-md p-2">
              {membros.map((m) => (
                <label
                  key={m.membroId}
                  className="flex items-center gap-2 cursor-pointer py-1"
                >
                  <Checkbox
                    checked={presentes.has(m.membroId)}
                    onCheckedChange={() => togglePresenca(m.membroId)}
                  />
                  <span className="text-sm">{m.nome}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Atualizar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
