"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS } from "@features/membros/lib/constants";

interface FormData {
  apelido: string;
  email: string;
  profissao: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  estadoCivil: string;
  nacionalidade: string;
  pai: string;
  mae: string;
}

interface Props {
  nomeCompleto: string;
  whatsapp: string;
  formData: FormData;
  onUpdate: (partial: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DataStep({ nomeCompleto, whatsapp, formData, onUpdate, onNext, onBack }: Props) {
  const faltando =
    !formData.cpf ||
    !formData.dataNascimento ||
    !formData.sexo ||
    !formData.estadoCivil ||
    !formData.nacionalidade ||
    !(formData.email || whatsapp) ||
    !formData.profissao;

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Complete seus dados</h2>
        <p className="text-xs text-muted-foreground">
          Preencha tudo para deixar seu cadastro completo.
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
      </div>

      <div className="space-y-3 pt-2 border-t">
        <div className="space-y-1">
          <Label htmlFor="ob-apelido" className="text-xs">Como prefere ser chamado?</Label>
          <Input
            id="ob-apelido"
            value={formData.apelido}
            onChange={(e) => onUpdate({ apelido: e.target.value })}
            placeholder="Apelido (opcional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ob-cpf" className="text-xs">CPF *</Label>
            <Input
              id="ob-cpf"
              inputMode="numeric"
              value={formData.cpf}
              onChange={(e) => onUpdate({ cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-nasc" className="text-xs">Data de nascimento *</Label>
            <Input
              id="ob-nasc"
              type="date"
              value={formData.dataNascimento}
              onChange={(e) => onUpdate({ dataNascimento: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Sexo *</Label>
            <Select value={formData.sexo} onValueChange={(v) => onUpdate({ sexo: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {SEXO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estado civil *</Label>
            <Select value={formData.estadoCivil} onValueChange={(v) => onUpdate({ estadoCivil: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {ESTADO_CIVIL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ob-nacionalidade" className="text-xs">Nacionalidade *</Label>
          <Input
            id="ob-nacionalidade"
            value={formData.nacionalidade}
            onChange={(e) => onUpdate({ nacionalidade: e.target.value })}
            placeholder="Brasileiro"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ob-email" className="text-xs">Email {whatsapp ? "" : "*"}</Label>
          <Input
            id="ob-email"
            type="email"
            value={formData.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ob-profissao" className="text-xs">Profissao *</Label>
          <Input
            id="ob-profissao"
            value={formData.profissao}
            onChange={(e) => onUpdate({ profissao: e.target.value })}
            placeholder="Sua profissao"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <Label htmlFor="ob-pai" className="text-xs">Nome do pai</Label>
            <Input
              id="ob-pai"
              value={formData.pai}
              onChange={(e) => onUpdate({ pai: e.target.value })}
              placeholder="Filiacao (opcional)"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ob-mae" className="text-xs">Nome da mae</Label>
            <Input
              id="ob-mae"
              value={formData.mae}
              onChange={(e) => onUpdate({ mae: e.target.value })}
              placeholder="Filiacao (opcional)"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={faltando} className="flex-1">
          Continuar <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
