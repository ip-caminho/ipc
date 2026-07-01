"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { textosSiteSchema, type TextosSiteFormValues } from "../lib/validations";
import { revalidarSite } from "../lib/revalidate";

export function TextosSiteForm({
  initial,
}: {
  initial: { heroTitulo?: string; heroSub?: string };
}) {
  // @ts-ignore Convex TS2589
  const updateTextos = useMutation(api.preferencias.mutations.updateTextosSite);

  const form = useForm<TextosSiteFormValues>({
    resolver: zodResolver(textosSiteSchema),
    defaultValues: {
      heroTitulo: initial.heroTitulo ?? "",
      heroSub: initial.heroSub ?? "",
    },
  });

  const onSubmit = async (values: TextosSiteFormValues) => {
    try {
      await updateTextos(values);
      await revalidarSite("textos");
      toast.success("Textos salvos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <Label htmlFor="heroTitulo">Título do hero (home)</Label>
        <Textarea id="heroTitulo" {...form.register("heroTitulo")} className="min-h-[70px]" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="heroSub">Subtítulo do hero</Label>
        <Input id="heroSub" {...form.register("heroSub")} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
