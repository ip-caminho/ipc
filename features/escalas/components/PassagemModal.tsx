"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  /** Referencia atual; pode conter varias passagens separadas por ";". */
  initialValue: string;
  /** Contexto exibido no header (ex: o label da funcao). */
  contexto?: string;
  /** Persiste a referencia ja unificada ("Sl 23; Rm 8:28"). Vazio = limpar. */
  onSave: (passagem: string) => void | Promise<void>;
}

// Uma string com varias passagens (separadas por ";") vira uma linha por
// passagem. Sempre mantem ao menos uma linha (vazia).
function splitPassagens(valor: string): string[] {
  const partes = valor
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.length > 0 ? partes : [""];
}

/**
 * Modal para editar a(s) passagem(ns) biblica(s) de uma escala liturgica.
 * Lista de passagens (adicionar/remover), cada uma com pre-visualizacao ao
 * vivo do texto. Ao salvar, junta tudo numa unica string ("; "), preservando
 * o modelo atual (passagemBiblica). Dialog no desktop, Drawer no mobile.
 */
export function PassagemModal({
  open,
  onOpenChange,
  initialValue,
  contexto,
  onSave,
}: PassagemModalProps) {
  const [rows, setRows] = useState<string[]>(() => splitPassagens(initialValue));
  const [saving, setSaving] = useState(false);

  // Sincroniza as linhas sempre que (re)abrir.
  useEffect(() => {
    if (open) setRows(splitPassagens(initialValue));
  }, [open, initialValue]);

  const updateRow = (index: number, valor: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? valor : r)));

  const addRow = () => setRows((prev) => [...prev, ""]);

  const removeRow = (index: number) =>
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const unificado = rows
        .map((r) => r.trim())
        .filter(Boolean)
        .join("; ");
      await onSave(unificado);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const temConteudo = rows.some((r) => r.trim() !== "");
  // Permite salvar vazio apenas para LIMPAR uma passagem que ja existia.
  const podeSalvar = temConteudo || initialValue.trim() !== "";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Passagem bíblica</ResponsiveDialogTitle>
          {contexto && (
            <ResponsiveDialogDescription>{contexto}</ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {rows.length > 1 ? `Passagem ${index + 1}` : "Referência"}
                </span>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(index)}
                    aria-label={`Remover passagem ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <BiblePassageInput
                variant="form"
                value={row}
                onChange={(v) => updateRow(index, v)}
                placeholder="Ex: Sl 23; Rm 8:28"
                autoFocus={index === 0}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addRow}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar passagem
          </Button>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !podeSalvar}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
