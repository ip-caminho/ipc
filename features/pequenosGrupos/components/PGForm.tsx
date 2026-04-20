"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { pgFormSchema, type PGFormValues } from "../lib/validations";
import { DIA_SEMANA_OPTIONS } from "../lib/constants";
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
import { ResponsiveSelect } from "@/shared/components/ui/responsive-select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";

interface PGFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PGFormValues) => Promise<void>;
  defaultValues?: Partial<PGFormValues>;
  isEditing?: boolean;
}

export function PGForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: PGFormProps) {
  const [loading, setLoading] = useState(false);
  const membros = useQuery(api.membros.queries.list, {});

  const form = useForm<PGFormValues>({
    resolver: zodResolver(pgFormSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      liderId: "",
      coliderId: "",
      diaSemana: "",
      horario: "",
      local: "",
      ...defaultValues,
    },
  });

  const liderOptions = useMemo(
    () =>
      (membros ?? []).map((m: any) => ({
        value: m._id as string,
        label: (m.entidade?.nomeCompleto as string) || "—",
      })),
    [membros],
  );

  const coliderOptions = useMemo(
    () => [{ value: "", label: "Nenhum" }, ...liderOptions],
    [liderOptions],
  );

  const handleSubmit = async (data: PGFormValues) => {
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
          <ResponsiveDialogTitle>
            {isEditing ? "Editar" : "Novo"} Pequeno Grupo
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
          <ResponsiveDialogBody className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...form.register("nome")} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea id="descricao" {...form.register("descricao")} />
            </div>

            <div className="space-y-1">
              <Label>Lider *</Label>
              <ResponsiveSelect
                options={liderOptions}
                value={form.watch("liderId")}
                onValueChange={(v) => form.setValue("liderId", v)}
                placeholder="Selecione o lider"
                searchPlaceholder="Buscar membro..."
                emptyMessage="Nenhum membro encontrado"
                title="Selecionar líder"
              />
              {form.formState.errors.liderId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.liderId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Co-lider</Label>
              <ResponsiveSelect
                options={coliderOptions}
                value={form.watch("coliderId") || ""}
                onValueChange={(v) => form.setValue("coliderId", v)}
                placeholder="Selecione (opcional)"
                searchPlaceholder="Buscar membro..."
                emptyMessage="Nenhum membro encontrado"
                title="Selecionar co-líder"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dia da semana</Label>
                <Select
                  value={form.watch("diaSemana") || ""}
                  onValueChange={(val) =>
                    form.setValue("diaSemana", val === "__none__" ? "" : val)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {DIA_SEMANA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="horario">Horario</Label>
                <Input
                  id="horario"
                  placeholder="19:30"
                  {...form.register("horario")}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="local">Local</Label>
              <Input id="local" {...form.register("local")} />
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
