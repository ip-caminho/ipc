"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import { toast } from "sonner";
import { WelcomeStep } from "./WelcomeStep";
import { PhotoStep } from "./PhotoStep";
import { DataStep } from "./DataStep";
import { AddressStep, type AddressData } from "./AddressStep";
import { EmergencyContactStep, type EmergencyContactData } from "./EmergencyContactStep";
import { CompletionStep } from "./CompletionStep";

interface OnboardingData {
  membroId: string;
  entidadeId: string;
  nomeCompleto: string;
  apelido: string;
  foto: string | null;
  whatsapp: string;
  email: string;
  dataNascimento: string;
  profissao: string;
  endereco: {
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  } | null;
  contatoEmergencia: {
    nome?: string;
    telefone?: string;
    parentesco?: string;
  } | null;
}

const TOTAL_STEPS = 6;

interface Props {
  data: OnboardingData;
}

export function OnboardingWizard({ data }: Props) {
  const completeOnboarding = useMutation(api.membros.onboarding.completeOnboarding);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [foto, setFoto] = useState<string | undefined>(data.foto || undefined);
  const [personalData, setPersonalData] = useState({
    apelido: data.apelido || "",
    email: data.email || "",
    profissao: data.profissao || "",
  });
  const [address, setAddress] = useState<AddressData>({
    logradouro: data.endereco?.logradouro || "",
    numero: data.endereco?.numero || "",
    bairro: data.endereco?.bairro || "",
    cidade: data.endereco?.cidade || "",
    estado: data.endereco?.estado || "",
    cep: data.endereco?.cep || "",
  });
  const [emergency, setEmergency] = useState<EmergencyContactData>({
    nome: data.contatoEmergencia?.nome || "",
    telefone: data.contatoEmergencia?.telefone || "",
    parentesco: data.contatoEmergencia?.parentesco || "",
  });

  const firstName = data.nomeCompleto.split(" ")[0];
  const progressValue = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  const handleComplete = async () => {
    setSaving(true);
    try {
      const hasAddress = address.logradouro && address.cidade && address.estado && address.cep;
      const hasEmergency = emergency.nome && emergency.telefone && emergency.parentesco;

      await completeOnboarding({
        foto,
        apelido: personalData.apelido || undefined,
        email: personalData.email || undefined,
        profissao: personalData.profissao || undefined,
        endereco: hasAddress
          ? {
              logradouro: address.logradouro,
              numero: address.numero,
              bairro: address.bairro,
              cidade: address.cidade,
              estado: address.estado,
              cep: address.cep,
            }
          : undefined,
        contatoEmergencia: hasEmergency
          ? {
              nome: emergency.nome,
              telefone: emergency.telefone,
              parentesco: emergency.parentesco,
            }
          : undefined,
      });

      setStep(TOTAL_STEPS - 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onNextFromEmergency = () => {
    handleComplete();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md space-y-4">
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <Progress value={progressValue} className="h-1.5" />
        )}

        <Card>
          <CardContent className="pt-6 pb-6">
            {step === 0 && (
              <WelcomeStep firstName={firstName} onNext={() => setStep(1)} />
            )}

            {step === 1 && (
              <PhotoStep
                foto={foto}
                nomeCompleto={data.nomeCompleto}
                entidadeId={data.entidadeId}
                onUpdate={setFoto}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <DataStep
                nomeCompleto={data.nomeCompleto}
                whatsapp={data.whatsapp}
                dataNascimento={data.dataNascimento}
                formData={personalData}
                onUpdate={(p) => setPersonalData((prev) => ({ ...prev, ...p }))}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <AddressStep
                formData={address}
                onUpdate={(p) => setAddress((prev) => ({ ...prev, ...p }))}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}

            {step === 4 && (
              <EmergencyContactStep
                formData={emergency}
                onUpdate={(p) => setEmergency((prev) => ({ ...prev, ...p }))}
                onNext={onNextFromEmergency}
                onBack={() => setStep(3)}
              />
            )}

            {step === 5 && <CompletionStep firstName={firstName} />}
          </CardContent>
        </Card>

        {step > 0 && step < TOTAL_STEPS - 1 && (
          <p className="text-center text-xs text-muted-foreground">
            Passo {step} de {TOTAL_STEPS - 2}
          </p>
        )}
      </div>
    </div>
  );
}
