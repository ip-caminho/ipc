"use client";

import { useEffect, useMemo } from "react";
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
import { DateFieldBR } from "@/shared/components/ui/date-picker-br";
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
import { DIA_SEMANA_OPTIONS, DIA_SEMANA_LABELS, CAMPOS_SISTEMA_OPTIONS } from "../lib/constants";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Presente = edicao. Na edicao NAO aparecem o curso (a turma copiou a
   * frequencia minima dele na criacao; trocar depois mudaria a regra no meio)
   * nem os campos do formulario de inscricao (orfanizaria respostas ja
   * enviadas).
   */
  turma?: Doc<"turmas">;
}

export function TurmaFormDialog({ open, onOpenChange, turma }: Props) {
  const editando = !!turma;
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const createTurma = useMutation(api.turmas.mutations.create);
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const updateTurma = useMutation(api.turmas.mutations.update);
  // @ts-expect-error Convex TS2589
  const membros = useQuery(api.membros.queries.list);
  const cursos = useQuery(api.cursos.queries.listAtivos, {});

  const form = useForm<TurmaFormValues>({
    resolver: zodResolver(turmaFormSchema),
    defaultValues: {
      nome: "",
      dataInicio: "",
      camposSistema: ["nomeCompleto"],
      perguntasExtras: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nome: turma?.nome ?? "",
      cursoId: turma?.cursoId ?? undefined,
      instrutorId: turma?.instrutorId ?? "",
      instrutorNome: turma?.instrutorNome ?? "",
      descricao: turma?.descricao ?? "",
      dataInicio: turma?.dataInicio ?? "",
      dataFim: turma?.dataFim ?? "",
      inscricoesDe: turma?.inscricoesDe ?? "",
      inscricoesAte: turma?.inscricoesAte ?? "",
      publicarNoSite: turma?.publicarNoSite ?? false,
      diaSemana: turma?.diaSemana ?? "",
      horario: turma?.horario ?? "",
      local: turma?.local ?? "",
      vagas: turma?.vagas,
      camposSistema: turma?.camposSistema ?? ["nomeCompleto"],
      perguntasExtras: turma?.perguntasExtras ?? [],
    });
  }, [open, turma, form]);

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
      if (turma) {
        // Campos vazios chegam como "" e a mutation trata isso como "remover"
        // — e assim que se apaga um prazo de inscricao ja definido.
        await updateTurma({
          id: turma._id,
          nome: values.nome,
          instrutorId: values.instrutorId ? (values.instrutorId as Id<"membros">) : undefined,
          instrutorNome: values.instrutorNome ?? "",
          descricao: values.descricao ?? "",
          dataInicio: values.dataInicio,
          dataFim: values.dataFim ?? "",
          inscricoesDe: values.inscricoesDe ?? "",
          inscricoesAte: values.inscricoesAte ?? "",
          publicarNoSite: values.publicarNoSite ?? false,
          diaSemana: values.diaSemana ?? "",
          horario: values.horario ?? "",
          local: values.local ?? "",
          vagas: values.vagas,
        });
        toast.success("Turma atualizada");
        onOpenChange(false);
        return;
      }

      await createTurma({
        nome: values.nome,
        cursoId: values.cursoId ? (values.cursoId as Id<"cursos">) : undefined,
        instrutorId: values.instrutorId ? (values.instrutorId as Id<"membros">) : undefined,
        instrutorNome: values.instrutorNome || undefined,
        descricao: values.descricao || undefined,
        dataInicio: values.dataInicio,
        dataFim: values.dataFim || undefined,
        inscricoesDe: values.inscricoesDe || undefined,
        inscricoesAte: values.inscricoesAte || undefined,
        publicarNoSite: values.publicarNoSite,
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
      toast.error((err as Error).message || "Erro ao salvar turma");
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{editando ? "Editar turma" : "Nova Turma"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <ResponsiveDialogBody className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...form.register("nome")} placeholder="Ex: Novos Membros - Turma 1/2026" />
          </div>

          {!editando && (
          <div>
            <Label>Curso</Label>
            <Select
              value={form.watch("cursoId") || "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  form.setValue("cursoId", undefined);
                  return;
                }
                form.setValue("cursoId", v);
                const curso = (cursos ?? []).find((c) => c._id === v);
                if (curso?.descricao && !form.getValues("descricao")) {
                  form.setValue("descricao", curso.descricao);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem curso (avulsa)</SelectItem>
                {(cursos ?? []).map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              O curso define a frequencia minima e gera as aulas automaticamente.
            </p>
          </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">Inicio</Label>
              <DateFieldBR control={form.control} name="dataInicio" id="dataInicio" />
            </div>
            <div>
              <Label htmlFor="dataFim">Fim</Label>
              <DateFieldBR control={form.control} name="dataFim" id="dataFim" />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div>
              <Label className="text-sm">Inscricoes</Label>
              <p className="text-xs text-muted-foreground">
                Periodo em que o formulario publico aceita inscricao. Deixe vazio para
                aceitar enquanto a turma estiver aberta e houver vaga.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inscricoesDe">Abrem em</Label>
                <DateFieldBR control={form.control} name="inscricoesDe" id="inscricoesDe" />
              </div>
              <div>
                <Label htmlFor="inscricoesAte">Encerram em</Label>
                <DateFieldBR control={form.control} name="inscricoesAte" id="inscricoesAte" />
              </div>
            </div>
            <Label
              htmlFor="publicarNoSite"
              className="flex items-center gap-3 min-h-[44px] font-normal cursor-pointer"
            >
              <Checkbox
                id="publicarNoSite"
                checked={form.watch("publicarNoSite") === true}
                onCheckedChange={(c) => form.setValue("publicarNoSite", c === true)}
              />
              <span className="text-sm">
                Divulgar no site da igreja enquanto a inscricao estiver aberta
              </span>
            </Label>

            {form.formState.errors.inscricoesAte && (
              <p className="text-xs text-destructive">
                {form.formState.errors.inscricoesAte.message}
              </p>
            )}
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

          {!editando && (
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
          )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {editando ? "Salvar" : "Criar"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
