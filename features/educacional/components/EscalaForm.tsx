"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { TURMA_OPTIONS, PAPEL_ESCALA_OPTIONS } from "../lib/constants";
import { escalaFormSchema, type EscalaFormValues } from "../lib/validations";
import { useState } from "react";

interface EscalaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EscalaFormValues) => Promise<void>;
  ministerioId: Id<"ministerios">;
}

export function EscalaForm({
  open,
  onOpenChange,
  onSubmit,
  ministerioId,
}: EscalaFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<EscalaFormValues>({
    resolver: zodResolver(escalaFormSchema),
    defaultValues: {
      data: "",
      subgrupo: "",
      membros: [{ membroId: "", papel: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "membros",
  });

  // Buscar membros do ministerio
  // @ts-ignore Convex TS2589
  const ministerioMembros = useQuery(api.ministerios.queries.getById, { id: ministerioId });
  const membrosList = ministerioMembros?.membros || [];

  const handleSubmit = async (data: EscalaFormValues) => {
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Nova Escala</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <ResponsiveDialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input type="date" {...form.register("data")} />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Turma</Label>
              <Select
                value={form.watch("subgrupo") || ""}
                onValueChange={(v) => form.setValue("subgrupo", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {TURMA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Membros *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ membroId: "", papel: "" })}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Select
                  value={form.watch(`membros.${index}.membroId`)}
                  onValueChange={(v) => form.setValue(`membros.${index}.membroId`, v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {membrosList.map((m: any) => (
                      <SelectItem key={m.membroId} value={m.membroId}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.watch(`membros.${index}.papel`) || ""}
                  onValueChange={(v) => form.setValue(`membros.${index}.papel`, v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEL_ESCALA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {form.formState.errors.membros && (
              <p className="text-xs text-destructive">
                {form.formState.errors.membros.message || "Adicione pelo menos um membro"}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Observacoes</Label>
            <Textarea {...form.register("observacoes")} rows={2} />
          </div>

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
