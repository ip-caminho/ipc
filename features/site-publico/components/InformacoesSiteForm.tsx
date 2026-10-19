"use client";

import type { ReactNode } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { StickyActionBar } from "@/shared/components/layout/StickyActionBar";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { igrejaInfoSchema, type IgrejaInfoFormValues } from "../lib/validations";
import { revalidarSite } from "../lib/revalidate";
import type { IgrejaInfo } from "../lib/nav";

const DIAS: string[] = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

export function InformacoesSiteForm({ initial }: { initial: IgrejaInfo }) {
  // @ts-ignore Convex TS2589
  const updateIgrejaInfo = useMutation(api.preferencias.mutations.updateIgrejaInfo);

  const form = useForm<IgrejaInfoFormValues>({
    resolver: zodResolver(igrejaInfoSchema),
    defaultValues: {
      nome: initial.nome ?? "",
      descricao: initial.descricao ?? "",
      endereco: initial.endereco ?? "",
      googleMapsEmbed: initial.googleMapsEmbed ?? "",
      horarios: initial.horarios ?? [],
      whatsapp: initial.whatsapp ?? "",
      telefone: initial.telefone ?? "",
      email: initial.email ?? "",
      banco: initial.banco ?? "",
      agencia: initial.agencia ?? "",
      conta: initial.conta ?? "",
      pix: initial.pix ?? "",
    },
  });

  const horarios = useFieldArray({ control: form.control, name: "horarios" });

  const onSubmit = async (values: IgrejaInfoFormValues) => {
    try {
      await updateIgrejaInfo({
        ...values,
        horarios: values.horarios?.map((h) => ({
          dia: h.dia,
          horario: h.horario,
          tipo: h.tipo ?? "",
        })),
      });
      await revalidarSite("informacoes");
      toast.success("Informações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-8 pb-28 md:pb-0">
      {/* Identidade */}
      <section className="space-y-3">
        <SecaoTitulo>Identidade</SecaoTitulo>
        <Field label="Nome" id="nome">
          <Input id="nome" autoComplete="organization" {...form.register("nome")} />
        </Field>
        <Field label="Descrição curta" id="descricao">
          <Textarea id="descricao" {...form.register("descricao")} />
        </Field>
      </section>

      {/* Contato & local */}
      <section className="space-y-3">
        <SecaoTitulo>Contato & local</SecaoTitulo>
        <Field label="Endereço" id="endereco">
          <Input id="endereco" {...form.register("endereco")} />
        </Field>
        <Field label="Google Maps (URL de embed)" id="googleMapsEmbed">
          <Input id="googleMapsEmbed" type="url" inputMode="url" {...form.register("googleMapsEmbed")} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-mail" id="email">
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field label="WhatsApp" id="whatsapp">
            <Input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel" {...form.register("whatsapp")} />
          </Field>
          <Field label="Telefone" id="telefone">
            <Input id="telefone" type="tel" inputMode="tel" autoComplete="tel" {...form.register("telefone")} />
          </Field>
        </div>
      </section>

      {/* Horários */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SecaoTitulo>Horários</SecaoTitulo>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => horarios.append({ dia: "", horario: "", tipo: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        {horarios.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum horário cadastrado. No site, o culto de domingo às 10h já aparece automaticamente.
          </p>
        )}
        {horarios.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1">
              <Label className="text-xs">Dia</Label>
              <Select
                value={form.watch(`horarios.${i}.dia`) || ""}
                onValueChange={(v) => form.setValue(`horarios.${i}.dia`, v, { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  {[...(f.dia && !DIAS.includes(f.dia) ? [f.dia] : []), ...DIAS].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Horário</Label>
              <Input
                type={/^(\d{2}:\d{2})?$/.test(f.horario ?? "") ? "time" : "text"}
                {...form.register(`horarios.${i}.horario`)}
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <Label className="text-xs">Tipo</Label>
              <Input {...form.register(`horarios.${i}.tipo`)} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-tap"
              className="col-start-2 row-start-3 justify-self-end text-muted-foreground hover:text-destructive sm:col-start-auto sm:row-start-auto"
              aria-label="Remover horário"
              onClick={() => horarios.remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>

      {/* Financeiro */}
      <section className="space-y-3">
        <SecaoTitulo>Dízimos e ofertas</SecaoTitulo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Banco" id="banco">
            <Input id="banco" {...form.register("banco")} />
          </Field>
          <Field label="Agência" id="agencia">
            <Input id="agencia" {...form.register("agencia")} />
          </Field>
          <Field label="Conta" id="conta">
            <Input id="conta" {...form.register("conta")} />
          </Field>
          <Field label="PIX / CNPJ" id="pix">
            <Input id="pix" {...form.register("pix")} />
          </Field>
        </div>
      </section>

      <StickyActionBar>
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </StickyActionBar>
    </form>
  );
}
