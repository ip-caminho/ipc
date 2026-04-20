"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@shared/lib/utils/cn";

type Tipo = "ATUALIZACAO" | "REFORCO" | "TESTEMUNHO";

const TIPO_OPTIONS: Array<{
  value: Tipo;
  label: string;
  dotClass: string;
}> = [
  { value: "ATUALIZACAO", label: "Atualização", dotClass: "bg-blue-500" },
  { value: "REFORCO", label: "Pedido continua", dotClass: "bg-amber-500" },
  { value: "TESTEMUNHO", label: "Testemunho", dotClass: "bg-emerald-500" },
];

const MIN_CHARS = 10;
const MAX_CHARS = 500;

interface Props {
  pedidoId: Id<"pedidosOracao">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUpdateModal({ pedidoId, open, onOpenChange }: Props) {
  const [tipo, setTipo] = useState<Tipo>("ATUALIZACAO");
  const [texto, setTexto] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addUpdate = useMutation(api.pedidosOracao.mutations.addUpdate);

  const trimmedLen = texto.trim().length;
  const canSubmit = trimmedLen >= MIN_CHARS && !submitting;

  const reset = () => {
    setTipo("ATUALIZACAO");
    setTexto("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addUpdate({ pedidoId, tipo, texto: texto.trim() });
      toast.success(
        tipo === "TESTEMUNHO"
          ? "Testemunho publicado. Pedido marcado como respondido."
          : "Atualização publicada",
      );
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="min-h-[75dvh] md:min-h-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Adicionar atualização</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <div className="flex flex-col gap-1.5">
              {TIPO_OPTIONS.map((opt) => {
                const active = tipo === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTipo(opt.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm text-left min-h-11 transition-colors",
                      active
                        ? "border-foreground bg-secondary font-medium"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", opt.dotClass)} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {tipo === "TESTEMUNHO" && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                Isso marcará o pedido como respondido.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Texto da atualização
            </Label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Compartilhe a atualização..."
              className="w-full text-base md:text-sm rounded-md border bg-background px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={4}
              style={{ minHeight: "100px" }}
            />
            <p className="text-[11px] text-muted-foreground">
              {trimmedLen < MIN_CHARS ? `Mínimo ${MIN_CHARS} caracteres` : ""}
            </p>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {submitting ? "Publicando..." : "Publicar atualização"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
