"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useDebounce } from "@shared/hooks/useDebounce";
import { StepShell } from "./StepShell";

interface Props {
  percentage: number;
  value: { nome: string; telefone: string; parentesco: string };
  onSave: (data: { nome: string; telefone: string; parentesco: string }) => void;
  onSkip: () => void;
  onBack: () => void;
  saving: boolean;
}

export function EmergencyContactStep({ percentage, value, onSave, onSkip, onBack, saving }: Props) {
  const [nome, setNome] = useState(value.nome);
  const [telefone, setTelefone] = useState(value.telefone);
  const [parentesco, setParentesco] = useState(value.parentesco);
  const debouncedNome = useDebounce(nome, 300);

  const searchResults = useQuery(
    api.membros.selfService.searchMembersForFamily,
    debouncedNome.trim().length >= 2 ? { search: debouncedNome.trim() } : "skip"
  );

  const [showResults, setShowResults] = useState(true);

  const selectMember = (member: { nomeCompleto: string; foto?: string | null }) => {
    setNome(member.nomeCompleto);
    setShowResults(false);
  };

  return (
    <StepShell
      title="Contato de emergencia"
      subtitle="Alguem que podemos contatar se necessario"
      percentage={percentage}
      onNext={() => onSave({ nome, telefone, parentesco })}
      onSkip={onSkip}
      onBack={onBack}
      saving={saving}
    >
      <div className="space-y-3">
        <div className="space-y-1 relative">
          <Label className="text-xs">Nome</Label>
          <Input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setShowResults(true);
            }}
            placeholder="Nome completo"
          />
          {showResults && searchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border bg-popover shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((m) => (
                <button
                  key={m.entidadeId}
                  type="button"
                  onClick={() => selectMember(m)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    {m.foto && <AvatarImage src={m.foto} alt={m.nomeCompleto} />}
                    <AvatarFallback className="text-xs">
                      {m.nomeCompleto.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{m.nomeCompleto}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="11999999999"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Parentesco</Label>
          <Input
            value={parentesco}
            onChange={(e) => setParentesco(e.target.value)}
            placeholder="Ex: Conjuge, Mae, Irmao"
          />
        </div>
      </div>
    </StepShell>
  );
}
