"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { toast } from "sonner";
import { calculateCompleteness } from "@convex/membros/completeness";
import { ESTADO_CIVIL_OPTIONS, FORMA_ADMISSAO_OPTIONS } from "@features/membros/lib/constants";
import { DatePickerField } from "@shared/components/DatePickerField";
import { WelcomeStep } from "./guided-steps/WelcomeStep";
import { StepShell } from "./guided-steps/StepShell";
import { EmergencyContactStep } from "./guided-steps/EmergencyContactStep";
import { CompletionStep } from "./guided-steps/CompletionStep";

type StepDef = {
  key: string;
  isFilled: () => boolean;
};

export function GuidedProfileFlow() {
  const profile = useQuery(api.membros.selfService.getMyProfile);
  const updateProfile = useMutation(api.membros.selfService.updateMyProfile);
  const updateMembresiaDatas = useMutation(api.membros.selfService.updateMembresiaDatas);
  const confirmProfile = useMutation(api.membros.selfService.confirmProfile);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [stepKey, setStepKey] = useState(0);

  const ent = profile?.entidade;
  const membro = profile;

  const completeness = useMemo(() => {
    if (!ent || !membro) return { percentage: 0, missing: [], filled: 0, total: 15 };
    return calculateCompleteness(ent, membro, (ent.dadosIncertos as string[]) ?? []);
  }, [ent, membro]);

  const steps: StepDef[] = useMemo(() => {
    if (!ent) return [];
    return [
      { key: "foto", isFilled: () => !!ent.foto },
      { key: "nomeCompleto", isFilled: () => !!ent.nomeCompleto },
      { key: "cpf", isFilled: () => !!ent.cpf },
      { key: "estadoCivil", isFilled: () => !!ent.estadoCivil },
      { key: "nacionalidade", isFilled: () => !!ent.nacionalidade },
      { key: "contato", isFilled: () => !!(ent.email || ent.telefone) },
      { key: "endereco", isFilled: () => !!(ent.endereco?.logradouro && ent.endereco?.cidade && ent.endereco?.estado && ent.endereco?.cep) },
      { key: "contatoEmergencia", isFilled: () => !!(ent.contatoEmergencia?.nome && ent.contatoEmergencia?.telefone && ent.contatoEmergencia?.parentesco) },
      { key: "profissao", isFilled: () => !!ent.profissao },
      { key: "dataBatismo", isFilled: () => !!membro?.dataBatismo },
      { key: "dataMembresia", isFilled: () => !!membro?.dataMembresia },
      { key: "formaAdmissao", isFilled: () => !!membro?.formaAdmissao },
    ].filter((s) => !s.isFilled());
  }, [ent]);

  const advance = useCallback(() => {
    setStepKey((k) => k + 1);
    setCurrentIndex((i) => {
      const next = i + 1;
      return next >= steps.length ? steps.length : next;
    });
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepKey((k) => k + 1);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const saveField = useCallback(
    async (data: Record<string, unknown>) => {
      setSaving(true);
      try {
        await updateProfile({ data });
        advance();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      } finally {
        setSaving(false);
      }
    },
    [updateProfile, advance]
  );

  const saveMembroField = useCallback(
    async (data: Record<string, string | null>) => {
      setSaving(true);
      try {
        await updateMembresiaDatas(data);
        advance();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      } finally {
        setSaving(false);
      }
    },
    [updateMembresiaDatas, advance]
  );

  const savePhoto = useCallback(
    async (url: string | null) => {
      try {
        await updateProfile({ data: { foto: url || "" } });
        toast.success("Foto atualizada");
      } catch {
        toast.error("Erro ao atualizar foto");
      }
    },
    [updateProfile]
  );

  const handleComplete = useCallback(async () => {
    try {
      await confirmProfile();
    } catch {}
    advance();
  }, [confirmProfile, advance]);

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full max-w-md mx-auto" />;
  }

  if (!profile || !ent) {
    return <p className="text-muted-foreground text-center py-12">Perfil nao encontrado.</p>;
  }

  const firstName = ent.apelido || ent.nomeCompleto?.split(" ")[0] || "";
  const isComplete = currentIndex >= steps.length;

  if (currentIndex === -1) {
    return (
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardContent className="pt-6 pb-6">
            <WelcomeStep
              firstName={firstName}
              percentage={completeness.percentage}
              missingLabels={completeness.missing.map((m) => m.label)}
              onStart={() => {
                if (steps.length === 0) {
                  handleComplete();
                } else {
                  setCurrentIndex(0);
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-md mx-auto px-4">
        <Card>
          <CardContent className="pt-6 pb-6">
            <CompletionStep firstName={firstName} percentage={completeness.percentage} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const step = steps[currentIndex];

  return (
    <div className="max-w-md mx-auto px-4" key={stepKey}>
      <Card>
        <CardContent className="pt-6 pb-6">
          {step.key === "foto" && (
            <StepShell
              title="Sua foto"
              subtitle="Ajuda a comunidade a te reconhecer"
              percentage={completeness.percentage}
              onNext={advance}
              onSkip={advance}
              onBack={currentIndex > 0 ? goBack : undefined}
              nextLabel={ent.foto ? "Continuar" : "Pular"}
            >
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-2 border-border">
                  {ent.foto && <AvatarImage src={ent.foto} alt={ent.nomeCompleto || ""} />}
                  <AvatarFallback className="text-4xl">{firstName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <FileUpload
                  folder="membros/fotos"
                  entityId={ent._id}
                  accept="image/*"
                  maxSizeMB={10}
                  value={ent.foto}
                  onChange={(url) => savePhoto(url ?? null)}
                  label="Escolher foto"
                />
              </div>
            </StepShell>
          )}

          {step.key === "nomeCompleto" && (
            <SimpleInputStep
              title="Nome completo"
              fieldKey="nomeCompleto"
              initial={ent.nomeCompleto || ""}
              percentage={completeness.percentage}
              onSave={saveField}
              onSkip={advance}
              onBack={currentIndex > 0 ? goBack : undefined}
              saving={saving}
            />
          )}

          {step.key === "cpf" && (
            <CpfStep
              initial={ent.cpf || ""}
              percentage={completeness.percentage}
              onSave={saveField}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "estadoCivil" && (
            <StepShell
              title="Estado civil"
              percentage={completeness.percentage}
              onNext={() => {}}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
              hideActions
            >
              <div className="space-y-3">
                {ESTADO_CIVIL_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => saveField({ estadoCivil: o.value })}
                    disabled={saving}
                    className="w-full text-left px-4 py-3 rounded-xl border hover:bg-muted transition-colors text-sm"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step.key === "nacionalidade" && (
            <SimpleInputStep
              title="Nacionalidade"
              fieldKey="nacionalidade"
              initial={ent.nacionalidade || ""}
              placeholder="Ex: Brasileiro(a)"
              datalist={["Brasileiro(a)", "Coreano(a)", "Japones(a)", "Chines(a)", "Estadunidense", "Portugues(a)", "Argentino(a)", "Colombiano(a)"]}
              percentage={completeness.percentage}
              onSave={saveField}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "contato" && (
            <ContactStep
              email={ent.email || ""}
              telefone={ent.telefone || ""}
              percentage={completeness.percentage}
              onSave={saveField}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "endereco" && (
            <AddressGuidedStep
              initial={ent.endereco as Record<string, string> | null}
              percentage={completeness.percentage}
              onSave={saveField}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "contatoEmergencia" && (
            <EmergencyContactStep
              percentage={completeness.percentage}
              value={{
                nome: (ent.contatoEmergencia as { nome?: string })?.nome || "",
                telefone: (ent.contatoEmergencia as { telefone?: string })?.telefone || "",
                parentesco: (ent.contatoEmergencia as { parentesco?: string })?.parentesco || "",
              }}
              onSave={(data) => saveField({ contatoEmergencia: data })}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "profissao" && (
            <SimpleInputStep
              title="Profissao"
              fieldKey="profissao"
              initial={ent.profissao || ""}
              placeholder="Ex: Engenheiro, Professor"
              percentage={completeness.percentage}
              onSave={saveField}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "dataBatismo" && (
            <DateStep
              title="Data de batismo"
              subtitle="Se nao lembrar, pode pular"
              initial={membro?.dataBatismo || ""}
              percentage={completeness.percentage}
              onSave={(iso) => saveMembroField({ dataBatismo: iso || null })}
              onSkip={advance}
              onBack={goBack}
              saving={saving}
            />
          )}

          {step.key === "dataMembresia" && (
            <StepShell
              title="Data de membresia"
              subtitle="Este campo e preenchido pela secretaria"
              percentage={completeness.percentage}
              onNext={advance}
              onBack={goBack}
              nextLabel="Entendi, continuar"
              hideActions={false}
            >
              <p className="text-sm text-muted-foreground text-center py-4">
                A data de membresia sera registrada pela secretaria com base no livro de atas.
              </p>
            </StepShell>
          )}

          {step.key === "formaAdmissao" && (
            <StepShell
              title="Forma de admissao"
              subtitle="Este campo e preenchido pela secretaria"
              percentage={completeness.percentage}
              onNext={advance}
              onBack={goBack}
              nextLabel="Entendi, continuar"
              hideActions={false}
            >
              <p className="text-sm text-muted-foreground text-center py-4">
                A forma de admissao sera registrada pela secretaria.
              </p>
            </StepShell>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground mt-3">
        {currentIndex + 1} de {steps.length}
      </p>
    </div>
  );
}

function SimpleInputStep({
  title,
  fieldKey,
  initial,
  placeholder,
  datalist,
  percentage,
  onSave,
  onSkip,
  onBack,
  saving,
}: {
  title: string;
  fieldKey: string;
  initial: string;
  placeholder?: string;
  datalist?: string[];
  percentage: number;
  onSave: (data: Record<string, unknown>) => void;
  onSkip: () => void;
  onBack?: () => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial);
  const listId = datalist ? `dl-${fieldKey}` : undefined;

  return (
    <StepShell
      title={title}
      percentage={percentage}
      onNext={() => onSave({ [fieldKey]: value })}
      onSkip={onSkip}
      onBack={onBack}
      saving={saving}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoFocus
        className="text-base"
      />
      {datalist && (
        <datalist id={listId}>
          {datalist.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      )}
    </StepShell>
  );
}

function CpfStep({
  initial,
  percentage,
  onSave,
  onSkip,
  onBack,
  saving,
}: {
  initial: string;
  percentage: number;
  onSave: (data: Record<string, unknown>) => void;
  onSkip: () => void;
  onBack?: () => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    const masked = raw
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setValue(masked);
  };

  return (
    <StepShell
      title="CPF"
      percentage={percentage}
      onNext={() => onSave({ cpf: value })}
      onSkip={onSkip}
      onBack={onBack}
      saving={saving}
    >
      <Input
        value={value}
        onChange={handleChange}
        placeholder="000.000.000-00"
        inputMode="numeric"
        autoFocus
        className="text-base text-center tracking-wider"
      />
    </StepShell>
  );
}

function ContactStep({
  email: initEmail,
  telefone: initTelefone,
  percentage,
  onSave,
  onSkip,
  onBack,
  saving,
}: {
  email: string;
  telefone: string;
  percentage: number;
  onSave: (data: Record<string, unknown>) => void;
  onSkip: () => void;
  onBack?: () => void;
  saving: boolean;
}) {
  const [email, setEmail] = useState(initEmail);
  const [telefone, setTelefone] = useState(initTelefone);

  return (
    <StepShell
      title="Contato"
      subtitle="Email ou telefone secundario"
      percentage={percentage}
      onNext={() => onSave({ email, telefone })}
      onSkip={onSkip}
      onBack={onBack}
      saving={saving}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="text-base" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11999999999" className="text-base" />
        </div>
      </div>
    </StepShell>
  );
}

function AddressGuidedStep({
  initial,
  percentage,
  onSave,
  onSkip,
  onBack,
  saving,
}: {
  initial: Record<string, string> | null;
  percentage: number;
  onSave: (data: Record<string, unknown>) => void;
  onSkip: () => void;
  onBack?: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    cep: initial?.cep || "",
    logradouro: initial?.logradouro || "",
    numero: initial?.numero || "",
    bairro: initial?.bairro || "",
    cidade: initial?.cidade || "",
    estado: initial?.estado || "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <StepShell
      title="Endereco"
      subtitle="Opcional — pode preencher depois"
      percentage={percentage}
      onNext={() => onSave({ endereco: form })}
      onSkip={onSkip}
      onBack={onBack}
      saving={saving}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">CEP</Label>
          <Input value={form.cep} onChange={set("cep")} placeholder="00000-000" inputMode="numeric" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rua / Avenida</Label>
          <Input value={form.logradouro} onChange={set("logradouro")} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Numero</Label>
            <Input value={form.numero} onChange={set("numero")} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Bairro</Label>
            <Input value={form.bairro} onChange={set("bairro")} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Cidade</Label>
            <Input value={form.cidade} onChange={set("cidade")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF</Label>
            <Input value={form.estado} onChange={set("estado")} maxLength={2} />
          </div>
        </div>
      </div>
    </StepShell>
  );
}

function DateStep({
  title,
  subtitle,
  initial,
  percentage,
  onSave,
  onSkip,
  onBack,
  saving,
}: {
  title: string;
  subtitle?: string;
  initial: string;
  percentage: number;
  onSave: (iso: string) => void;
  onSkip: () => void;
  onBack?: () => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial);

  return (
    <StepShell
      title={title}
      subtitle={subtitle}
      percentage={percentage}
      onNext={() => onSave(value)}
      onSkip={onSkip}
      onBack={onBack}
      saving={saving}
    >
      <DatePickerField
        value={value}
        onChange={setValue}
        placeholder="dd/mm/aaaa"
        maxDate={new Date()}
      />
    </StepShell>
  );
}
