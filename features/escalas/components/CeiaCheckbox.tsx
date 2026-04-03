"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface CeiaCheckboxProps {
  cultoId: Id<"cultos">;
  temCeia: boolean;
  canEdit: boolean;
}

export function CeiaCheckbox({ cultoId, temCeia, canEdit }: CeiaCheckboxProps) {
  const updateCulto = useMutation(api.escalas.mutations.updateCulto);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const confirma = confirm("Confirma que haverá Santa Ceia neste culto?");
      if (!confirma) return;
    }
    try {
      await updateCulto({ id: cultoId, temCeia: checked });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <Label htmlFor={`ceia-${cultoId}`} className="text-sm text-muted-foreground cursor-pointer flex-1">
        Santa Ceia
      </Label>
      <Switch
        id={`ceia-${cultoId}`}
        size="sm"
        checked={temCeia}
        onCheckedChange={canEdit ? (v) => handleToggle(!!v) : undefined}
        disabled={!canEdit}
      />
    </div>
  );
}
