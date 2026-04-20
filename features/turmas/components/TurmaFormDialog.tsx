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
import { turmaFormSchema, type TurmaFormValues } from "../lib/validations";
import { DIA_SEMANA_OPTIONS, DIA_SEMANA_LABELS, CAMPOS_SISTEMA_OPTIONS, TIPOS_TURMA, type TipoTurma } from "../lib/constants";
import { Checkbox } from "@/shared/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TurmaFormDialog({ open, onOpenChange }: Props) {
  const createTurma = useMutation(api.turmas.mutations.create);
  // @ts-expect-error Convex TS2589
  const membros = useQuery(api.membros.queries.list);

  const form = useForm<TurmaFormValues>({
    resolver: zodResolver(turmaFormSchema),
    defaultValues: {
      nome: "",
      dataInicio: "",
      camposSistema: ["nomeCompleto"],
      perguntasExtras: [],
    },
  });

  const instrutorOptions = useMemo(
    () => [
      { value: "", label: "Nenhum" },
      ...(membros ?? []).map((m: any) => ({
        value: m._id as string,
        label: (m.entidade?.nomeCompleto as string) || m._id,
      })),
    ],
    [membros],
  );

  async function onSubmit(values: TurmaFormValues) {
    try {
      await createTurma({
        nome: values.nome,
        tipo: values.tipo,
        instrutorId: values.instrutorId ? values.instrutorId as any : undefined,
        instrutorNome: values.instrutorNome || undefined,
        descricao: values.descricao || undefined,
        dataInicio: values.dataInicio,
        dataFim: values.dataFim || undefined,
        diaSemana: values.diaSemana || undefined,
        horario: values.horario || undefined,
        local: values.local || undefined,
        vagas: values.vagas,
        camposSistema: values.camposSistema,
        perguntasExtras: values.perguntasExtras,
      });
      toast.success("Turma criada");
      form.reset();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao criar turma");
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Nova Turma</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <ResponsiveDialogBody className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...form.register("nome")} placeholder="Ex: Novos Membros - Turma 1/2026" />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={form.watch("tipo") || "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  form.setValue("tipo", undefined);
                  return;
                }
                form.setValue("tipo", v as TipoTurma);
                const tipo = TIPOS_TURMA.find((t) => t.value === v);
                if (tipo && tipo.descricaoTemplate && !form.getValues("descricao")) {
                  form.setValue("descricao", tipo.descricaoTemplate);
                }
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione...</SelectItem>
                {TIPOS_TURMA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">Inicio</Label>
              <Input id="dataInicio" type="date" {...form.register("dataInicio")} />
            </div>
            <div>
              <Label htmlFor="dataFim">Fim</Label>
              <Input id="dataFim" type="date" {...form.register("dataFim")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Dia</Label>
              <Select
                value={form.watch("diaSemana") || "__none__"}
                onValueChange={(v) => form.setValue("diaSemana", v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-</SelectItem>
                  {DIA_SEMANA_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{DIA_SEMANA_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="horario">Horario</Label>
              <Input id="horario" {...form.register("horario")} placeholder="19:30" />
            </div>
            <div>
              <Label htmlFor="vagas">Vagas</Label>
              <Input id="vagas" type="number" {...form.register("vagas", { valueAsNumber: true })} placeholder="Ilimitado" />
            </div>
          </div>

          <div>
            <Label htmlFor="local">Local</Label>
            <Input id="local" {...form.register("local")} placeholder="Sala 1" />
          </div>

          <div>
            <Label>Instrutor</Label>
            <ResponsiveSelect
              options={instrutorOptions}
              value={form.watch("instrutorId") || ""}
              onValueChange={(v) => form.setValue("instrutorId", v)}
              placeholder="Selecione..."
              searchPlaceholder="Buscar membro..."
              emptyMessage="Nenhum membro encontrado"
              title="Selecionar instrutor"
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descricao</Label>
            <Textarea id="descricao" {...form.register("descricao")} rows={2} />
          </div>

          <div>
            <Label>Campos do formulario de inscricao</Label>
            <div className="space-y-2 mt-1">
              {CAMPOS_SISTEMA_OPTIONS.map((campo) => (
                <label key={campo.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch("camposSistema").includes(campo.value)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("camposSistema");
                      form.setValue(
                        "camposSistema",
                        checked
                          ? [...current, campo.value]
                          : current.filter((c) => c !== campo.value)
                      );
                    }}
                  />
                  {campo.label}
                </label>
              ))}
            </div>
          </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Criar
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
