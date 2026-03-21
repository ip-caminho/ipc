"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { anotacaoFormSchema, type AnotacaoFormValues } from "../lib/validations";
import { Button } from "@/shared/components/ui/button";
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

interface AnotacaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AnotacaoFormValues) => Promise<void>;
  defaultMembroId?: string;
}

export function AnotacaoForm({
  open,
  onOpenChange,
  onSubmit,
  defaultMembroId,
}: AnotacaoFormProps) {
  const [loading, setLoading] = useState(false);
  const membros = useQuery(api.membros.queries.list, {});

  const form = useForm<AnotacaoFormValues>({
    resolver: zodResolver(anotacaoFormSchema),
    defaultValues: {
      membroId: defaultMembroId || "",
      texto: "",
    },
  });

  const handleSubmit = async (data: AnotacaoFormValues) => {
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
          <DialogTitle>Nova Anotacao Pastoral</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Membro *</Label>
            <Select
              value={form.watch("membroId")}
              onValueChange={(val) => form.setValue("membroId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o membro" />
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
            <Label htmlFor="texto">Anotacao *</Label>
            <Textarea
              id="texto"
              rows={4}
              placeholder="Escreva aqui a anotacao pastoral..."
              {...form.register("texto")}
            />
            {form.formState.errors.texto && (
              <p className="text-xs text-destructive">
                {form.formState.errors.texto.message}
              </p>
            )}
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
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
