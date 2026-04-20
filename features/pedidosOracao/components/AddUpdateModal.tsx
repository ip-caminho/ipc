"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { useIsMobile } from "@shared/hooks/use-mobile";
import { ArrowLeft, Check, X } from "lucide-react";

type Tipo = "ATUALIZACAO" | "REFORCO" | "TESTEMUNHO";

const TIPO_OPTIONS: Array<{
  value: Tipo;
  label: string;
  description: string;
  dotClass: string;
}> = [
  {
    value: "ATUALIZACAO",
    label: "Atualização",
    description: "Como estão as coisas agora.",
    dotClass: "bg-blue-500",
  },
  {
    value: "REFORCO",
    label: "Pedido continua",
    description: "Ainda preciso de oração por isso.",
    dotClass: "bg-amber-500",
  },
  {
    value: "TESTEMUNHO",
    label: "Testemunho",
    description: "Deus respondeu. Pedido será marcado como respondido.",
    dotClass: "bg-emerald-500",
  },
];

const MIN_CHARS = 10;
const MAX_CHARS = 500;

interface Props {
  pedidoId: Id<"pedidosOracao">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUpdateModal(props: Props) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileFlow {...props} />;
  return <DesktopDialog {...props} />;
}

/* -------------------- Desktop -------------------- */

function DesktopDialog({ pedidoId, open, onOpenChange }: Props) {
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
      <ResponsiveDialogContent>
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
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", opt.dotClass)}
                    />
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
              className="w-full text-sm rounded-md border bg-background px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
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

/* -------------------- Mobile (one question per page) -------------------- */

type Step = "tipo" | "texto";
const STEPS: Step[] = ["tipo", "texto"];

function MobileFlow({ pedidoId, open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("tipo");
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [texto, setTexto] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addUpdate = useMutation(api.pedidosOracao.mutations.addUpdate);
  const textoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("tipo");
      setTipo(null);
      setTexto("");
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "texto") return;
    const el = textoRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [texto, step]);

  const currentIndex = STEPS.indexOf(step);
  const isLastStep = currentIndex === STEPS.length - 1;
  const trimmedLen = texto.trim().length;

  const canAdvance = (() => {
    switch (step) {
      case "tipo":
        return tipo !== null;
      case "texto":
        return trimmedLen >= MIN_CHARS;
    }
  })();

  const handleSubmit = async () => {
    if (!tipo || submitting) return;
    setSubmitting(true);
    try {
      await addUpdate({ pedidoId, tipo, texto: texto.trim() });
      toast.success(
        tipo === "TESTEMUNHO"
          ? "Testemunho publicado. Pedido marcado como respondido."
          : "Atualização publicada",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!canAdvance) return;
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setStep(STEPS[currentIndex + 1]);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      onOpenChange(false);
      return;
    }
    setStep(STEPS[currentIndex - 1]);
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-background flex flex-col"
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex items-center gap-2 px-3 h-14 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-full active:opacity-70"
          aria-label={currentIndex === 0 ? "Fechar" : "Voltar"}
        >
          {currentIndex === 0 ? (
            <X className="h-5 w-5" />
          ) : (
            <ArrowLeft className="h-5 w-5" />
          )}
        </button>
        <div className="flex-1 flex items-center gap-1 px-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-0.5 rounded-full transition-colors",
                i <= currentIndex ? "bg-foreground" : "bg-muted-foreground/20",
              )}
            />
          ))}
        </div>
        <div className="min-w-11" />
      </header>

      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
        {step === "tipo" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-medium leading-tight">
              Que tipo de atualização?
            </h2>
            <p className="text-sm text-muted-foreground">
              Escolha o que melhor descreve este momento.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {TIPO_OPTIONS.map((opt) => {
                const active = tipo === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTipo(opt.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left min-h-14 transition-colors",
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0 mt-1.5",
                        opt.dotClass,
                      )}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                    {active && (
                      <Check className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "texto" && (
          <div className="flex flex-col gap-6 pt-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {tipo === "TESTEMUNHO"
                ? "Conte o que aconteceu"
                : tipo === "REFORCO"
                  ? "O que continua pesando"
                  : "Como estão as coisas"}
            </h2>
            <textarea
              ref={textoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Escreva aqui…"
              rows={1}
              className="w-full bg-transparent border-0 outline-none resize-none p-0 font-serif italic text-[20px] leading-[1.6] text-foreground placeholder:text-muted-foreground/50 placeholder:italic"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums">
              <span>
                {trimmedLen < MIN_CHARS && trimmedLen > 0
                  ? `mais ${MIN_CHARS - trimmedLen} ${
                      MIN_CHARS - trimmedLen === 1 ? "caractere" : "caracteres"
                    }`
                  : " "}
              </span>
              {trimmedLen > 280 && (
                <span>
                  {trimmedLen}/{MAX_CHARS}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="px-4 pt-2 pb-3 shrink-0">
        <Button
          onClick={handleNext}
          disabled={!canAdvance || submitting}
          className="w-full h-12 text-base bg-foreground text-background hover:bg-foreground/90"
        >
          {submitting
            ? "Publicando..."
            : isLastStep
              ? "Publicar atualização"
              : "Continuar"}
        </Button>
      </footer>
    </div>,
    document.body,
  );
}
