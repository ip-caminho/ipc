"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface AddressData {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

interface Props {
  formData: AddressData;
  onUpdate: (partial: Partial<AddressData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AddressStep({ formData, onUpdate, onNext, onBack }: Props) {
  const hasAny = Object.values(formData).some((v) => v.trim() !== "");

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Endereco</h2>
        <p className="text-xs text-muted-foreground">
          Opcional — pode preencher depois no perfil
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ob-cep" className="text-xs">CEP</Label>
          <Input
            id="ob-cep"
            value={formData.cep}
            onChange={(e) => onUpdate({ cep: e.target.value })}
            placeholder="00000-000"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-logradouro" className="text-xs">Rua / Avenida</Label>
          <Input
            id="ob-logradouro"
            value={formData.logradouro}
            onChange={(e) => onUpdate({ logradouro: e.target.value })}
            placeholder="Rua Exemplo"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="ob-numero" className="text-xs">Numero</Label>
            <Input
              id="ob-numero"
              value={formData.numero}
              onChange={(e) => onUpdate({ numero: e.target.value })}
              placeholder="123"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor="ob-bairro" className="text-xs">Bairro</Label>
            <Input
              id="ob-bairro"
              value={formData.bairro}
              onChange={(e) => onUpdate({ bairro: e.target.value })}
              placeholder="Centro"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="ob-cidade" className="text-xs">Cidade</Label>
            <Input
              id="ob-cidade"
              value={formData.cidade}
              onChange={(e) => onUpdate({ cidade: e.target.value })}
              placeholder="Sao Paulo"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-estado" className="text-xs">UF</Label>
            <Input
              id="ob-estado"
              value={formData.estado}
              onChange={(e) => onUpdate({ estado: e.target.value })}
              placeholder="SP"
              maxLength={2}
            />
          </div>
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
