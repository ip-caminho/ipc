"use client";

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
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { DateFieldBR } from "@/shared/components/ui/date-picker-br";
import { getConvexErrorMessage } from "@/shared/lib/utils/convexError";
import { ausenciaFormSchema, type AusenciaFormValues } from "../lib/validations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvisoAusenciaDialog({ open, onOpenChange }: Props) {
  // @ts-ignore Convex TS2589
  const criarAusencia = useMutation(api.ausencias.mutations.criarAusencia);

  const form = useForm<AusenciaFormValues>({
    resolver: zodResolver(ausenciaFormSchema),
    defaultValues: { dataInicio: "", dataFim: "", motivo: "" },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: AusenciaFormValues) {
    try {
      await criarAusencia({
        dataInicio: values.dataInicio,
        dataFim: values.dataFim || undefined,
        motivo: values.motivo?.trim() || undefined,
      });
      toast.success("Ausência registrada.");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error, "Erro ao registrar ausência"));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Registrar ausência</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Avise que você não estará disponível. Fica visível para a liderança
            no calendário e você não será escalado nesse período.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ResponsiveDialogBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dataInicio">Início</Label>
                <DateFieldBR control={control} name="dataInicio" id="dataInicio" />
                {errors.dataInicio && (
                  <p className="text-xs text-destructive">{errors.dataInicio.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dataFim">Fim (opcional)</Label>
                <DateFieldBR
                  control={control}
                  name="dataFim"
                  id="dataFim"
                  placeholder="Mesmo dia"
                />
                {errors.dataFim && (
                  <p className="text-xs text-destructive">{errors.dataFim.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                rows={3}
                placeholder="Ex: viagem, compromisso familiar…"
                {...register("motivo")}
              />
            </div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Registrando…" : "Registrar ausência"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
