"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TURMA_OPTIONS, USO_IMAGEM_OPTIONS } from "../lib/constants";
import { criancaFormSchema, type CriancaFormValues } from "../lib/validations";
import { useState } from "react";

interface CriancaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CriancaFormValues) => Promise<void>;
  defaultValues?: Partial<CriancaFormValues>;
  isEditing?: boolean;
}

export function CriancaForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: CriancaFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CriancaFormValues>({
    resolver: zodResolver(criancaFormSchema),
    defaultValues: {
      nomeCompleto: "",
      turma: "",
      usoImagem: "PENDENTE",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: CriancaFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Crianca" : "Nova Crianca"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome completo *</Label>
            <Input {...form.register("nomeCompleto")} />
            {form.formState.errors.nomeCompleto && (
              <p className="text-xs text-destructive">{form.formState.errors.nomeCompleto.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data de nascimento</Label>
              <Input type="date" {...form.register("dataNascimento")} />
            </div>
            <div className="space-y-1">
              <Label>Sexo</Label>
              <Select
                value={form.watch("sexo") || ""}
                onValueChange={(v) => form.setValue("sexo", v as "M" | "F")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Turma *</Label>
              <Select
                value={form.watch("turma")}
                onValueChange={(v) => form.setValue("turma", v)}
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
              <Label>Uso de imagem *</Label>
              <Select
                value={form.watch("usoImagem")}
                onValueChange={(v) => form.setValue("usoImagem", v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {USO_IMAGEM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observacoes medicas</Label>
            <Textarea {...form.register("observacoesMedicas")} rows={2} />
          </div>

          <div className="space-y-1">
            <Label>Observacoes da familia</Label>
            <Textarea {...form.register("observacoesFamilia")} rows={2} />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
