"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface EmergencyContactData {
  nome: string;
  telefone: string;
  parentesco: string;
}

interface Props {
  formData: EmergencyContactData;
  onUpdate: (partial: Partial<EmergencyContactData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function EmergencyContactStep({ formData, onUpdate, onNext, onBack }: Props) {
  const hasAny = Object.values(formData).some((v) => v.trim() !== "");

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Contato de emergencia</h2>
        <p className="text-xs text-muted-foreground">
          Opcional — alguem que podemos contatar se necessario
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ob-ce-nome" className="text-xs">Nome</Label>
          <Input
            id="ob-ce-nome"
            value={formData.nome}
            onChange={(e) => onUpdate({ nome: e.target.value })}
            placeholder="Nome completo"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-ce-telefone" className="text-xs">Telefone</Label>
          <Input
            id="ob-ce-telefone"
            type="tel"
            value={formData.telefone}
            onChange={(e) => onUpdate({ telefone: e.target.value })}
            placeholder="11999999999"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-ce-parentesco" className="text-xs">Parentesco</Label>
          <Input
            id="ob-ce-parentesco"
            value={formData.parentesco}
            onChange={(e) => onUpdate({ parentesco: e.target.value })}
            placeholder="Ex: Mae, Esposo, Irma"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button onClick={onNext} className="flex-1">
          {hasAny ? "Continuar" : "Pular"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
