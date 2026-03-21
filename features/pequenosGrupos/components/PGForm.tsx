"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar" : "Novo"} Pequeno Grupo
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            <Select
              value={form.watch("liderId")}
              onValueChange={(val) => form.setValue("liderId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lider" />
              </SelectTrigger>
              <SelectContent>
                {membros?.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.entidade?.nomeCompleto || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.liderId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.liderId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Co-lider</Label>
            <Select
              value={form.watch("coliderId") || ""}
              onValueChange={(val) =>
                form.setValue("coliderId", val === "__none__" ? "" : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {membros?.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.entidade?.nomeCompleto || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectTrigger>
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

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
