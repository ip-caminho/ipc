"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { membroFormSchema, type MembroFormValues } from "../lib/validations";
import {
  SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS, FORMACAO_OPTIONS,
  CARGO_ECLESIASTICO_OPTIONS, FORMA_ADMISSAO_OPTIONS, ROLE_OPTIONS,
  CBCM_OPTIONS, TIPO_DOCUMENTO_OPTIONS, VINCULO_IGREJA_OPTIONS,
  FORMA_DEMISSAO_OPTIONS, MOTIVO_DEMISSAO_OPTIONS,
} from "../lib/constants";
import { useState, useRef } from "react";
import { PhotoUpload } from "@/shared/files/components/PhotoUpload";
import { FileUpload } from "@/shared/files/components/FileUpload";

interface MembroFormProps {
  defaultValues?: Partial<MembroFormValues>;
  onSubmit: (data: MembroFormValues) => Promise<void>;
  isEditing?: boolean;
  entityId?: string;
}

export function MembroForm({ defaultValues, onSubmit, isEditing, entityId }: MembroFormProps) {
  const [loading, setLoading] = useState(false);
  const tempIdRef = useRef(crypto.randomUUID());
  const uploadEntityId = entityId || tempIdRef.current;
  const form = useForm<MembroFormValues>({
    resolver: zodResolver(membroFormSchema),
    defaultValues: {
      nomeCompleto: "",
      role: "membro",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: MembroFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  // Helper for form field
  const Field = ({ name, label, type = "text", placeholder = "" }: { name: keyof MembroFormValues; label: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} {...form.register(name)} />
      {form.formState.errors[name] && (
        <p className="text-xs text-destructive">{form.formState.errors[name]?.message}</p>
      )}
    </div>
  );

  // Helper for select field
  const SelectField = ({ name, label, options }: { name: keyof MembroFormValues; label: string; options: readonly { value: string; label: string }[] }) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={form.watch(name) as string || ""} onValueChange={(v) => form.setValue(name, v)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Section component
  const Section = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <h3 className="text-sm font-semibold">{title}</h3>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Membro" : "Novo Membro"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="Dados Pessoais">
            <div className="sm:col-span-2 lg:col-span-3">
              <PhotoUpload
                folder="membros/fotos"
                entityId={uploadEntityId}
                value={form.watch("foto")}
                onChange={(url) => form.setValue("foto", url || "")}
                fallback={form.watch("nomeCompleto")}
              />
            </div>
            <div className="sm:col-span-2">
              <Field name="nomeCompleto" label="Nome Completo *" />
            </div>
            <Field name="apelido" label="Apelido" placeholder="Como e conhecido" />
            <Field name="cpf" label="CPF" placeholder="000.000.000-00" />
            <div className="space-y-1">
              <Label>Documento</Label>
              <div className="flex gap-2">
                <Select value={form.watch("tipoDocumento") || ""} onValueChange={(v) => form.setValue("tipoDocumento", v as any)}>
                  <SelectTrigger className="w-24 flex-shrink-0">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Numero do documento" {...form.register("rg")} />
              </div>
            </div>
            <Field name="dataNascimento" label="Data de Nascimento" type="date" />
            <SelectField name="sexo" label="Sexo" options={SEXO_OPTIONS} />
            <SelectField name="estadoCivil" label="Estado Civil" options={ESTADO_CIVIL_OPTIONS} />
            <Field name="nacionalidade" label="Nacionalidade" />
            <Field name="pai" label="Nome do Pai" />
            <Field name="mae" label="Nome da Mae" />
            <Field name="profissao" label="Profissao" />
            <SelectField name="formacao" label="Formacao" options={FORMACAO_OPTIONS} />
          </Section>

          <Section title="Contato">
            <Field name="whatsapp" label="WhatsApp" placeholder="11999991111" />
            <Field name="telefone" label="Telefone" />
            <Field name="email" label="Email" type="email" />
          </Section>

          <Section title="Endereço" defaultOpen={false}>
            <Field name="logradouro" label="Logradouro" />
            <Field name="numero" label="Número" />
            <Field name="complemento" label="Complemento" />
            <Field name="bairro" label="Bairro" />
            <Field name="cidade" label="Cidade" />
            <Field name="estado" label="Estado" />
            <Field name="cep" label="CEP" placeholder="00000-000" />
          </Section>

          <Section title="Dados Eclesiasticos" defaultOpen={false}>
            <SelectField name="vinculoIgreja" label="Vinculo com a Igreja" options={VINCULO_IGREJA_OPTIONS} />
            <SelectField name="role" label="Perfil no Sistema" options={ROLE_OPTIONS} />
            <Field name="rol" label="Numero do Rol" />
            <Field name="numeroMatricula" label="Numero de Matricula (IPB)" />
            <Field name="dataMembresia" label="Data da Membresia" type="date" />
            <SelectField name="formaAdmissao" label="Forma de Admissao" options={FORMA_ADMISSAO_OPTIONS} />
            <SelectField name="cargoEclesiastico" label="Cargo Eclesiastico" options={CARGO_ECLESIASTICO_OPTIONS} />
            <Field name="dataConversao" label="Data de Conversao" type="date" />
            <Field name="dataBatismo" label="Data de Batismo" type="date" />
            <Field name="igrejaProcedencia" label="Igreja de Procedencia" />
            <SelectField name="cbcm" label="CBCM" options={CBCM_OPTIONS} />
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="observacoesPastorais">Observacoes Pastorais</Label>
              <Textarea
                id="observacoesPastorais"
                rows={3}
                placeholder="Anotacoes da secretaria/pastoral (visivel apenas para admins e equipe pastoral)"
                {...form.register("observacoesPastorais")}
              />
            </div>
          </Section>

          <Section title="Demissao / Saida do Rol" defaultOpen={false}>
            <SelectField name="formaDemissao" label="Forma de Demissao" options={FORMA_DEMISSAO_OPTIONS} />
            <Field name="dataDemissao" label="Data da Demissao" type="date" />
            <Field name="igrejaDestino" label="Igreja de Destino (transferencia)" />
            <Field name="dataFalecimento" label="Data de Falecimento" type="date" />
            {form.watch("formaDemissao") === "TRANSFERENCIA" && (
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <Label>Carta de Transferencia *</Label>
                <FileUpload
                  folder="membros/cartas-transferencia"
                  entityId={uploadEntityId}
                  accept="application/pdf,image/*"
                  value={form.watch("cartaTransferencia") || undefined}
                  onChange={(url) => form.setValue("cartaTransferencia", url || "")}
                  label="Anexar carta (PDF ou imagem)"
                />
                {form.formState.errors.cartaTransferencia && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.cartaTransferencia.message}
                  </p>
                )}
              </div>
            )}
            {form.watch("formaDemissao") === "EXCLUSAO" && (
              <>
                <SelectField name="motivoDemissao" label="Motivo da Exclusao" options={MOTIVO_DEMISSAO_OPTIONS} />
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="motivoDemissaoObs">Observacao do Motivo</Label>
                  <Textarea
                    id="motivoDemissaoObs"
                    rows={2}
                    placeholder="Detalhe o motivo da exclusao (opcional)"
                    {...form.register("motivoDemissaoObs")}
                  />
                </div>
              </>
            )}
          </Section>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : isEditing ? "Salvar Alteracoes" : "Criar Membro"}
        </Button>
      </div>
    </form>
  );
}
