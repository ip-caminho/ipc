"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DateFieldBR } from "@/shared/components/ui/date-picker-br";
import { FileUpload } from "@/shared/files/components/FileUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  TURMA_OPTIONS,
  PAPEL_VOLUNTARIO_OPTIONS,
  CBCM_OPTIONS,
} from "../lib/constants";
import {
  voluntarioFormSchema,
  type VoluntarioFormValues,
} from "../lib/validations";

interface VoluntarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VoluntarioFormValues) => Promise<void>;
  defaultValues?: Partial<VoluntarioFormValues>;
  isEditing?: boolean;
  /** Nome fixo do membro na edicao (o membro nao muda). */
  membroNome?: string;
}

export function VoluntarioForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
  membroNome,
}: VoluntarioFormProps) {
  const [loading, setLoading] = useState(false);
  // @ts-ignore Convex TS2589
  const membros = useQuery(api.educacional.queries.listMembrosParaVoluntario, open && !isEditing ? {} : "skip");

  const form = useForm<VoluntarioFormValues>({
    resolver: zodResolver(voluntarioFormSchema),
    defaultValues: {
      membroId: "",
      papelEdu: "PROFESSOR",
      turmasHabilitadas: [],
      cbcm: "NAO_INICIADO",
      ...defaultValues,
    },
  });

  const turmas = form.watch("turmasHabilitadas") || [];
  const membroId = form.watch("membroId");

  const toggleTurma = (turma: string, checked: boolean) => {
    const atual = form.getValues("turmasHabilitadas") || [];
    form.setValue(
      "turmasHabilitadas",
      checked ? [...atual, turma] : atual.filter((t) => t !== turma)
    );
  };

  const handleSubmit = async (data: VoluntarioFormValues) => {
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Voluntario" : "Novo Voluntario"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Membro *</Label>
            {isEditing ? (
              <p className="text-sm font-medium">{membroNome}</p>
            ) : (
              <Select
                value={membroId}
                onValueChange={(v) => form.setValue("membroId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent>
                  {(membros || []).map((m) => (
                    <SelectItem
                      key={m.membroId}
                      value={m.membroId}
                      disabled={m.jaVoluntario}
                    >
                      {m.nome}
                      {m.jaVoluntario ? " (ja voluntario)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.membroId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.membroId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Papel *</Label>
              <Select
                value={form.watch("papelEdu")}
                onValueChange={(v) => form.setValue("papelEdu", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEL_VOLUNTARIO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>CBCM</Label>
              <Select
                value={form.watch("cbcm") || "NAO_INICIADO"}
                onValueChange={(v) => form.setValue("cbcm", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CBCM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Turmas que pode servir</Label>
            <div className="grid grid-cols-2 gap-2">
              {TURMA_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={turmas.includes(opt.value)}
                    onCheckedChange={(v) => toggleTurma(opt.value, v === true)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Validade do CAC</Label>
            <DateFieldBR control={form.control} name="cacValidade" />
          </div>

          <div className="space-y-1">
            <Label>Certificado CAC</Label>
            {membroId ? (
              <FileUpload
                folder="educacional/certificados-cac"
                entityId={membroId}
                accept="application/pdf,image/*"
                value={form.watch("certificadoCacUrl") || undefined}
                onChange={(url) =>
                  form.setValue("certificadoCacUrl", url ?? undefined)
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Selecione o membro antes de anexar o certificado.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Observacoes</Label>
            <Textarea {...form.register("observacoes")} rows={2} />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
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
