"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface CeiaCheckboxProps {
  cultoId: Id<"cultos">;
  temCeia: boolean;
  canEdit: boolean;
}

export function CeiaCheckbox({ cultoId, temCeia, canEdit }: CeiaCheckboxProps) {
  const updateCulto = useMutation(api.escalas.mutations.updateCulto);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (checked && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    try {
      await updateCulto({ id: cultoId, temCeia: checked });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="flex items-center gap-3 w-full min-h-11">
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
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirma Santa Ceia?</AlertDialogTitle>
            <AlertDialogDescription>Confirma que haverá Santa Ceia neste culto?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 md:h-9"
              onClick={() => {
                handleToggle(true);
                setConfirmOpen(false);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
