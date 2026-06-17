"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { BiblePassageInput } from "@/shared/bible/components/BiblePassageInput";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";

interface PassagemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Referencia atual (ex: "Sl 23; Rm 8:28"). */
  initialValue: string;
  /** Contexto exibido no header (ex: o label da funcao). */
  contexto?: string;
  /** Persiste a referencia (ja com trim). String vazia = limpar. */
  onSave: (passagem: string) => void | Promise<void>;
}

/**
 * Modal para editar a passagem biblica de uma escala liturgica, com
 * pre-visualizacao ao vivo do texto (BiblePassageInput variant="form").
 * Dialog no desktop, Drawer no mobile (ResponsiveDialog).
 */
export function PassagemModal({
  open,
  onOpenChange,
  initialValue,
  contexto,
  onSave,
}: PassagemModalProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  // Sincroniza o valor sempre que (re)abrir.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Passagem bíblica</ResponsiveDialogTitle>
          {contexto && (
            <ResponsiveDialogDescription>{contexto}</ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Referência</p>
          <BiblePassageInput
            variant="form"
            value={value}
            onChange={setValue}
            placeholder="Ex: Sl 23; Rm 8:28"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
