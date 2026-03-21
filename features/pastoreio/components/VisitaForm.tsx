"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar" : "Nova"} Visita Pastoral
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Membro visitado *</Label>
            <Select
              value={form.watch("membroId")}
              onValueChange={(val) => form.setValue("membroId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {membros?.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.entidade?.nomeCompleto || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.membroId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.membroId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Visitante *</Label>
            <Select
              value={form.watch("visitanteId")}
              onValueChange={(val) => form.setValue("visitanteId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {membros?.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.entidade?.nomeCompleto || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectTrigger>
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

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
