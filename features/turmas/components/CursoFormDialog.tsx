"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
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
import { cursoFormSchema, type CursoFormValues } from "../lib/validations";
import { FREQUENCIA_MINIMA_PADRAO } from "../lib/constants";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso?: Doc<"cursos">; // presente = edicao
}

export function CursoFormDialog({ open, onOpenChange, curso }: Props) {
  const createCurso = useMutation(api.cursos.mutations.create);
  const updateCurso = useMutation(api.cursos.mutations.update);

  const form = useForm<CursoFormValues>({
    resolver: zodResolver(cursoFormSchema),
    defaultValues: {
      nome: "",
      frequenciaMinima: FREQUENCIA_MINIMA_PADRAO,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nome: curso?.nome ?? "",
      descricao: curso?.descricao ?? "",
      ementa: curso?.ementa ?? "",
      cargaHoraria: curso?.cargaHoraria,
      totalAulas: curso?.totalAulas,
      frequenciaMinima: curso?.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO,
    });
  }, [open, curso, form]);

  async function onSubmit(values: CursoFormValues) {
    try {
      const payload = {
        nome: values.nome,
        descricao: values.descricao || undefined,
        ementa: values.ementa || undefined,
        cargaHoraria: Number.isFinite(values.cargaHoraria) ? values.cargaHoraria : undefined,
        totalAulas: Number.isFinite(values.totalAulas) ? values.totalAulas : undefined,
        frequenciaMinima: values.frequenciaMinima,
      };

      if (curso) {
        await updateCurso({ id: curso._id as Id<"cursos">, ...payload });
        toast.success("Curso atualizado");
      } else {
        await createCurso(payload);
        toast.success("Curso criado");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar curso");
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{curso ? "Editar curso" : "Novo curso"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <ResponsiveDialogBody className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                {...form.register("nome")}
                placeholder="Ex: Curso de Novos Membros"
              />
              <p className="text-xs text-muted-foreground mt-1">
                E o nome que sai impresso no certificado.
              </p>
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                {...form.register("descricao")}
                rows={2}
                placeholder="Aparece na pagina publica de inscricao"
              />
            </div>

            <div>
              <Label htmlFor="ementa">Ementa</Label>
              <Textarea
                id="ementa"
                {...form.register("ementa")}
                rows={3}
                placeholder="Conteudo programatico"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cargaHoraria">Carga horaria</Label>
                <Input
                  id="cargaHoraria"
                  type="number"
                  inputMode="numeric"
                  {...form.register("cargaHoraria", { valueAsNumber: true })}
                  placeholder="horas"
                />
              </div>
              <div>
                <Label htmlFor="totalAulas">Total de aulas</Label>
                <Input
                  id="totalAulas"
                  type="number"
                  inputMode="numeric"
                  {...form.register("totalAulas", { valueAsNumber: true })}
                  placeholder="Ex: 8"
                />
              </div>
              <div>
                <Label htmlFor="frequenciaMinima">Frequencia minima (%)</Label>
                <Input
                  id="frequenciaMinima"
                  type="number"
                  inputMode="numeric"
                  {...form.register("frequenciaMinima", { valueAsNumber: true })}
                />
                {form.formState.errors.frequenciaMinima && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.frequenciaMinima.message}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O total de aulas gera automaticamente os encontros da turma. A frequencia
              minima e copiada para a turma quando ela e criada — mudar aqui nao altera
              turma em andamento.
            </p>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {curso ? "Salvar" : "Criar"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
