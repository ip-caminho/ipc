"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { eventoFormSchema, type EventoFormValues } from "../lib/validations";
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

interface EventoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventoFormValues) => Promise<void>;
  defaultValues?: Partial<EventoFormValues>;
  isEditing?: boolean;
}

export function EventoForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: EventoFormProps) {
  const [loading, setLoading] = useState(false);
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, { status: "ATIVO" });

  const form = useForm<EventoFormValues>({
    resolver: zodResolver(eventoFormSchema),
    defaultValues: {
      titulo: "",
      data: "",
      dataFim: "",
      ministerioId: "",
      descricao: "",
      tipo: "evento",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: EventoFormValues) => {
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
            {isEditing ? "Editar" : "Novo"} Evento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input id="titulo" {...form.register("titulo")} />
            {form.formState.errors.titulo && (
              <p className="text-xs text-destructive">
                {form.formState.errors.titulo.message}
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
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input id="dataFim" type="date" {...form.register("dataFim")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Ministerio</Label>
            <Select
              value={form.watch("ministerioId") || ""}
              onValueChange={(val) =>
                form.setValue("ministerioId", val === "__none__" ? "" : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Geral (todos)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Geral (todos)</SelectItem>
                {ministerios?.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Tipo (agenda pública)</Label>
            <Select
              value={form.watch("tipo") || "evento"}
              onValueChange={(val) =>
                form.setValue("tipo", val as "evento" | "pg" | "reuniao")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="pg">Pequeno Grupo</SelectItem>
                <SelectItem value="reuniao">Reunião</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="descricao">Descricao</Label>
            <Textarea id="descricao" {...form.register("descricao")} />
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
