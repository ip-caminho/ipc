"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface CeiaCheckboxProps {
  cultoId: Id<"cultos">;
  temCeia: boolean;
  pregadorNome?: string;
  canEdit: boolean;
}

const PASTOR_NOME = "bernardo";

export function CeiaCheckbox({ cultoId, temCeia, pregadorNome, canEdit }: CeiaCheckboxProps) {
  const updateCulto = useMutation(api.escalas.mutations.updateCulto);

  const isPastorPregando = pregadorNome
    ? pregadorNome.toLowerCase().includes(PASTOR_NOME)
    : false;

  const showAlerta = !isPastorPregando && pregadorNome;

  const handleToggle = async (checked: boolean) => {
    if (showAlerta && checked) {
      const confirma = confirm(
        `O pregador deste domingo é ${pregadorNome}. Confirma que haverá Santa Ceia?`
      );
      if (!confirma) return;
    }
    try {
      await updateCulto({ id: cultoId, temCeia: checked });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`ceia-${cultoId}`}
        checked={temCeia}
        onCheckedChange={canEdit ? (v) => handleToggle(!!v) : undefined}
        disabled={!canEdit}
      />
      <Label htmlFor={`ceia-${cultoId}`} className="text-xs cursor-pointer">
        Santa Ceia
      </Label>
      {showAlerta && temCeia && (
        <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          Confirmar com {pregadorNome}
        </span>
      )}
    </div>
  );
}
