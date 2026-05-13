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
import { Plus, Briefcase, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CARGO_OPTIONS = [
  { value: "PASTOR", label: "Pastor" },
  { value: "PRESBITERO", label: "Presbitero" },
  { value: "DIACONO", label: "Diacono" },
] as const;

type Cargo = (typeof CARGO_OPTIONS)[number]["value"];

const STATUS_COLOR: Record<string, string> = {
  ATIVO: "bg-green-100 text-green-800",
  ENCERRADO: "bg-gray-100 text-gray-700",
  AFASTADO: "bg-amber-100 text-amber-800",
};

export function CargosHistoricoSection({ membroId }: { membroId: Id<"membros"> }) {
  const cargos = useQuery(api.cargosEclesiasticosHistorico.queries.listByMembro, { membroId });
  const iniciar = useMutation(api.cargosEclesiasticosHistorico.mutations.iniciarMandato);
  const encerrar = useMutation(api.cargosEclesiasticosHistorico.mutations.encerrarMandato);
  const remover = useMutation(api.cargosEclesiasticosHistorico.mutations.remover);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    cargo: Cargo;
    mandatoInicio: string;
    observacoes: string;
  }>({
    cargo: "DIACONO",
    mandatoInicio: "",
    observacoes: "",
  });

  const handleIniciar = async () => {
    if (!form.mandatoInicio) {
      toast.error("Informe o inicio do mandato");
      return;
    }
    setSaving(true);
    try {
      await iniciar({
        membroId,
        cargo: form.cargo,
        mandatoInicio: form.mandatoInicio,
        observacoes: form.observacoes || undefined,
      });
      toast.success("Mandato registrado");
      setOpen(false);
      setForm({ cargo: "DIACONO", mandatoInicio: "", observacoes: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleEncerrar = async (id: Id<"cargosEclesiasticosHistorico">) => {
    const fim = prompt("Data de encerramento (YYYY-MM-DD)");
    if (!fim) return;
    try {
      await encerrar({ id, mandatoFim: fim });
      toast.success("Mandato encerrado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemover = async (id: Id<"cargosEclesiasticosHistorico">) => {
    if (!confirm("Remover este registro?")) return;
    try {
      await remover({ id });
      toast.success("Removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" /> Cargos Eclesiasticos (historico)
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" /> Registrar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar mandato</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cargo</Label>
                  <Select value={form.cargo} onValueChange={(v) => setForm((p) => ({ ...p, cargo: v as Cargo }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARGO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inicio do mandato *</Label>
                  <Input
                    type="date"
                    value={form.mandatoInicio}
                    onChange={(e) => setForm((p) => ({ ...p, mandatoInicio: e.target.value }))}
                  />
                </div>
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
              <Button onClick={handleIniciar} disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {cargos === undefined ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : cargos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum cargo registrado.</p>
        ) : (
          <ul className="space-y-1">
            {cargos.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{CARGO_OPTIONS.find((o) => o.value === c.cargo)?.label}</Badge>
                    <Badge className={STATUS_COLOR[c.status]} variant="outline">{c.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.mandatoInicio} {c.mandatoFim ? `- ${c.mandatoFim}` : "(em curso)"}
                  </div>
                </div>
                {c.status === "ATIVO" && (
                  <Button size="sm" variant="ghost" onClick={() => handleEncerrar(c._id)} aria-label="Encerrar">
                    <Square className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleRemover(c._id)} aria-label="Remover">
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
