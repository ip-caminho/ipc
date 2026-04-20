"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { visitaFormSchema, type VisitaFormValues } from "../lib/validations";
import { TIPO_VISITA_OPTIONS } from "../lib/constants";
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

interface VisitaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VisitaFormValues) => Promise<void>;
  defaultValues?: Partial<VisitaFormValues>;
  isEditing?: boolean;
}

export function VisitaForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: VisitaFormProps) {
  const [loading, setLoading] = useState(false);
  const membros = useQuery(api.membros.queries.list, {});

  const form = useForm<VisitaFormValues>({
    resolver: zodResolver(visitaFormSchema),
    defaultValues: {
      membroId: "",
      visitanteId: "",
      data: new Date().toISOString().split("T")[0],
      tipo: "DOMICILIAR",
      observacoes: "",
      ...defaultValues,
    },
  });

  const membroOptions = useMemo(
    () =>
      (membros ?? []).map((m: any) => ({
        value: m._id as string,
        label: (m.entidade?.nomeCompleto as string) || "—",
      })),
    [membros],
  );

  const handleSubmit = async (data: VisitaFormValues) => {
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
            {isEditing ? "Editar" : "Nova"} Visita Pastoral
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
          <ResponsiveDialogBody className="space-y-4">
            <div className="space-y-1">
              <Label>Membro visitado *</Label>
              <ResponsiveSelect
                options={membroOptions}
                value={form.watch("membroId")}
                onValueChange={(v) => form.setValue("membroId", v)}
                placeholder="Selecione"
                searchPlaceholder="Buscar membro..."
                emptyMessage="Nenhum membro encontrado"
                title="Selecionar membro visitado"
              />
              {form.formState.errors.membroId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.membroId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Visitante *</Label>
              <ResponsiveSelect
                options={membroOptions}
                value={form.watch("visitanteId")}
                onValueChange={(v) => form.setValue("visitanteId", v)}
                placeholder="Selecione"
                searchPlaceholder="Buscar membro..."
                emptyMessage="Nenhum membro encontrado"
                title="Selecionar visitante"
              />
              {form.formState.errors.visitanteId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.visitanteId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="data">Data *</Label>
                <Input id="data" type="date" {...form.register("data")} />
                {form.formState.errors.data && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.data.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select
                  value={form.watch("tipo")}
                  onValueChange={(val: any) => form.setValue("tipo", val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_VISITA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Textarea
                id="observacoes"
                rows={3}
                {...form.register("observacoes")}
              />
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
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Registrar"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
