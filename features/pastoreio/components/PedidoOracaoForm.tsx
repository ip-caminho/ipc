"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  pedidoOracaoFormSchema,
  type PedidoOracaoFormValues,
} from "../lib/validations";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";

interface PedidoOracaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PedidoOracaoFormValues) => Promise<void>;
}

export function PedidoOracaoForm({
  open,
  onOpenChange,
  onSubmit,
}: PedidoOracaoFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PedidoOracaoFormValues>({
    resolver: zodResolver(pedidoOracaoFormSchema),
    defaultValues: { descricao: "" },
  });

  const handleSubmit = async (data: PedidoOracaoFormValues) => {
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
          <DialogTitle>Novo Pedido de Oracao</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="descricao">Descreva seu pedido *</Label>
            <Textarea
              id="descricao"
              rows={4}
              placeholder="Escreva aqui seu pedido de oracao..."
              {...form.register("descricao")}
            />
            {form.formState.errors.descricao && (
              <p className="text-xs text-destructive">
                {form.formState.errors.descricao.message}
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
              {loading ? "Enviando..." : "Enviar pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
