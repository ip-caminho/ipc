"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIPO_OPTIONS = [
  { value: "BATISMO", label: "Batismo" },
  { value: "PROFISSAO_FE", label: "Profissao de Fe" },
  { value: "CASAMENTO", label: "Casamento" },
  { value: "FUNERAL", label: "Funeral" },
  { value: "RESTAURACAO", label: "Restauracao" },
  { value: "OUTRO", label: "Outro" },
] as const;

type Tipo = (typeof TIPO_OPTIONS)[number]["value"];

export function AtosPastoraisSection({ membroId }: { membroId: Id<"membros"> }) {
  const atos = useQuery(api.atosPastorais.queries.listByMembro, { membroId });
  const registrar = useMutation(api.atosPastorais.mutations.registrar);
  const remover = useMutation(api.atosPastorais.mutations.remover);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    tipo: Tipo;
    data: string;
    local: string;
    oficiante: string;
    padrinhos: string;
    observacoes: string;
    livroFolha: string;
  }>({
    tipo: "BATISMO",
    data: "",
    local: "",
    oficiante: "",
    padrinhos: "",
    observacoes: "",
    livroFolha: "",
  });

  const handleSubmit = async () => {
    if (!form.data) {
      toast.error("Informe a data");
      return;
    }
    setSaving(true);
    try {
      await registrar({
        membroId,
        tipo: form.tipo,
        data: form.data,
        local: form.local || undefined,
        oficiante: form.oficiante || undefined,
        padrinhos: form.padrinhos
          ? form.padrinhos.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        observacoes: form.observacoes || undefined,
        livroFolha: form.livroFolha || undefined,
      });
      toast.success("Ato pastoral registrado");
      setOpen(false);
      setForm({
        tipo: "BATISMO",
        data: "",
        local: "",
        oficiante: "",
        padrinhos: "",
        observacoes: "",
        livroFolha: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  };

  const handleRemover = async (id: Id<"atosPastorais">) => {
    if (!confirm("Remover este ato pastoral?")) return;
    try {
      await remover({ id });
      toast.success("Removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Atos Pastorais
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" /> Registrar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar ato pastoral</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as Tipo }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data *</Label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Local</Label>
                <Input
                  value={form.local}
                  onChange={(e) => setForm((p) => ({ ...p, local: e.target.value }))}
                  placeholder="Ex: IPC Sao Paulo, Capela X"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Oficiante</Label>
                <Input
                  value={form.oficiante}
                  onChange={(e) => setForm((p) => ({ ...p, oficiante: e.target.value }))}
                  placeholder="Nome do pastor/presbitero que oficiou"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Padrinhos (separar por virgula)</Label>
                <Input
                  value={form.padrinhos}
                  onChange={(e) => setForm((p) => ({ ...p, padrinhos: e.target.value }))}
                  placeholder="Joao Silva, Maria Souza"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Livro/Folha (registro fisico)</Label>
                <Input
                  value={form.livroFolha}
                  onChange={(e) => setForm((p) => ({ ...p, livroFolha: e.target.value }))}
                  placeholder="Ex: Livro 3, folha 42"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observacoes</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {atos === undefined ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : atos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum ato pastoral registrado.</p>
        ) : (
          <ul className="space-y-1">
            {atos.map((a) => (
              <li
                key={a._id}
                className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {TIPO_OPTIONS.find((o) => o.value === a.tipo)?.label ?? a.tipo}
                    </Badge>
                    <span className="font-medium">{a.data}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[a.local, a.oficiante, a.livroFolha].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemover(a._id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
