"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TURMA_OPTIONS } from "../lib/constants";
import { relatorioFormSchema, type RelatorioFormValues } from "../lib/validations";
import { useState } from "react";

interface RelatorioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RelatorioFormValues) => Promise<void>;
}

export function RelatorioForm({ open, onOpenChange, onSubmit }: RelatorioFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RelatorioFormValues>({
    resolver: zodResolver(relatorioFormSchema),
    defaultValues: {
      turma: "",
      data: new Date().toISOString().slice(0, 10),
      professores: "",
      presentes: [],
    },
  });

  const turmaSelecionada = form.watch("turma");
  const presentes = form.watch("presentes");

  // Buscar criancas da turma selecionada
  const criancas = useQuery(
    api.educacional.queries.listCriancas,
    turmaSelecionada ? { turma: turmaSelecionada } : "skip"
  );

  const handleSubmit = async (data: RelatorioFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const togglePresente = (entidadeId: string) => {
    const current = form.getValues("presentes");
    if (current.includes(entidadeId)) {
      form.setValue("presentes", current.filter((id) => id !== entidadeId));
    } else {
      form.setValue("presentes", [...current, entidadeId]);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Novo Relatorio</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <ResponsiveDialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Turma *</Label>
              <Select
                value={turmaSelecionada}
                onValueChange={(v) => {
                  form.setValue("turma", v);
                  form.setValue("presentes", []);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TURMA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.turma && (
                <p className="text-xs text-destructive">{form.formState.errors.turma.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input type="date" {...form.register("data")} />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Professores *</Label>
            <Input {...form.register("professores")} placeholder="Ana, Bruno" />
            {form.formState.errors.professores && (
              <p className="text-xs text-destructive">{form.formState.errors.professores.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Observacoes</Label>
            <Textarea {...form.register("observacoes")} rows={2} />
          </div>

          {/* Lista de criancas para presenca */}
          {turmaSelecionada && (
            <div className="space-y-2">
              <Label>Presenca ({presentes.length} presente{presentes.length !== 1 ? "s" : ""})</Label>
              {!criancas ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : criancas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma crianca nesta turma</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
                  {criancas.map((c: any) => (
                    <label
                      key={c.entidadeId}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                    >
                      <Checkbox
                        checked={presentes.includes(c.entidadeId)}
                        onCheckedChange={() => togglePresente(c.entidadeId)}
                      />
                      {c.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Criar"}
          </Button>
        </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
