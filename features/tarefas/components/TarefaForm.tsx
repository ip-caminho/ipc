"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ResponsiveSelect } from "@/shared/components/ui/responsive-select";
import { tarefaFormSchema, type TarefaFormValues } from "../lib/validations";
import { PRIORIDADE_OPTIONS } from "../lib/constants";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { Id } from "@/convex/_generated/dataModel";

interface TarefaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<TarefaFormValues>;
  tarefaId?: Id<"tarefas">;
}

export function TarefaForm({ open, onOpenChange, defaultValues, tarefaId }: TarefaFormProps) {
  const { membroId } = useAuth();
  const createTarefa = useMutation(api.tarefas.mutations.create);
  const updateTarefa = useMutation(api.tarefas.mutations.update);
  // @ts-expect-error Convex TS2589
  const membros = useQuery(api.membros.queries.list);

  const form = useForm<TarefaFormValues>({
    resolver: zodResolver(tarefaFormSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      prioridade: "MEDIA",
      responsavelId: membroId || "",
      dataVencimento: "",
      ...defaultValues,
    },
  });

  const responsavelOptions = useMemo(
    () =>
      (membros ?? []).map((m: any) => ({
        value: m._id as string,
        label: (m.entidade?.nomeCompleto as string) || m._id,
      })),
    [membros],
  );

  const isEditing = !!tarefaId;

  async function onSubmit(values: TarefaFormValues) {
    try {
      if (isEditing) {
        await updateTarefa({
          id: tarefaId!,
          titulo: values.titulo,
          descricao: values.descricao || undefined,
          prioridade: values.prioridade,
          responsavelId: values.responsavelId as Id<"membros">,
          dataVencimento: values.dataVencimento || undefined,
        });
        toast.success("Tarefa atualizada");
      } else {
        await createTarefa({
          titulo: values.titulo,
          descricao: values.descricao || undefined,
          prioridade: values.prioridade,
          responsavelId: values.responsavelId as Id<"membros">,
          dataVencimento: values.dataVencimento || undefined,
          moduloRelacionado: values.moduloRelacionado as typeof values.moduloRelacionado,
          referenciaId: values.referenciaId,
          referenciaTitulo: values.referenciaTitulo,
        });
        toast.success("Tarefa criada");
      }
      form.reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar tarefa");
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <ResponsiveDialogBody className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" {...form.register("titulo")} placeholder="O que precisa ser feito?" />
              {form.formState.errors.titulo && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.titulo.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" {...form.register("descricao")} rows={3} placeholder="Detalhes (opcional)" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.watch("prioridade")}
                  onValueChange={(v) => form.setValue("prioridade", v as TarefaFormValues["prioridade"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dataVencimento">Prazo</Label>
                <Input id="dataVencimento" type="date" {...form.register("dataVencimento")} />
              </div>
            </div>

            <div>
              <Label>Responsável</Label>
              <ResponsiveSelect
                options={responsavelOptions}
                value={form.watch("responsavelId")}
                onValueChange={(v) => form.setValue("responsavelId", v)}
                placeholder="Selecione..."
                searchPlaceholder="Buscar membro..."
                emptyMessage="Nenhum membro encontrado"
                title="Selecionar responsável"
              />
              {form.formState.errors.responsavelId && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.responsavelId.message}</p>
              )}
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
