"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface FormData {
  apelido: string;
  email: string;
  profissao: string;
}

interface Props {
  nomeCompleto: string;
  whatsapp: string;
  dataNascimento: string;
  formData: FormData;
  onUpdate: (partial: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DataStep({
  nomeCompleto,
  whatsapp,
  dataNascimento,
  formData,
  onUpdate,
  onNext,
  onBack,
}: Props) {
  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Confirme seus dados</h2>
        <p className="text-xs text-muted-foreground">
          Voce pode alterar depois no seu perfil
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <p className="text-sm font-medium">{nomeCompleto}</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">WhatsApp</Label>
          <p className="text-sm">{whatsapp || "Nao informado"}</p>
        </div>
        {dataNascimento && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
            <p className="text-sm">{dataNascimento.split("-").reverse().join("/")}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t">
        <div className="space-y-1">
          <Label htmlFor="ob-apelido" className="text-xs">Como prefere ser chamado?</Label>
          <Input
            id="ob-apelido"
            value={formData.apelido}
            onChange={(e) => onUpdate({ apelido: e.target.value })}
            placeholder={nomeCompleto.split(" ")[0]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-email" className="text-xs">Email</Label>
          <Input
            id="ob-email"
            type="email"
            value={formData.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="seu@email.com"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-profissao" className="text-xs">Profissao</Label>
          <Input
            id="ob-profissao"
            value={formData.profissao}
            onChange={(e) => onUpdate({ profissao: e.target.value })}
            placeholder="Ex: Engenheiro, Professor"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continuar
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
