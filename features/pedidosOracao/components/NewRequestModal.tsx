"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@shared/lib/utils/cn";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { ArrowLeft, Check, Globe, Lock, Shield, Users, X } from "lucide-react";

type Scope = "private" | "pg" | "leaders" | "church";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: Id<"pedidosOracao">) => void;
}

const SCOPE_OPTIONS: Array<{
  value: Scope;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "private",
    label: "Somente eu",
    description: "Para levar a Deus em silêncio.",
    icon: Lock,
  },
  {
    value: "pg",
    label: "Meu PG",
    description: "Apenas quem está no meu pequeno grupo.",
    icon: Users,
  },
  {
    value: "leaders",
    label: "Líderes e pastores",
    description: "Para quem pastoreia a igreja.",
    icon: Shield,
  },
  {
    value: "church",
    label: "Toda a igreja",
    description: "Qualquer membro pode orar.",
    icon: Globe,
  },
];

const MIN_CHARS = 10;
const WARN_CHARS = 280;
const MAX_CHARS = 500;

export function NewRequestModal(props: Props) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileFlow {...props} />;
  return <DesktopDialog {...props} />;
}

/* -------------------- Desktop (single dialog) -------------------- */

function DesktopDialog({ open, onOpenChange, onCreated }: Props) {
  const { membroId } = useAuth();
  const [texto, setTexto] = useState("");
  const [scope, setScope] = useState<Scope>("church");
  const [pgId, setPgId] = useState<Id<"pequenosGrupos"> | null>(null);
  const [anonimo, setAnonimo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createMut = useMutation(api.pedidosOracao.mutations.createPrayerRequest);
  // @ts-ignore Convex TS2589
  const meusPgs = useQuery(
    api.pequenosGrupos.queries.listByMembro,
    membroId ? { membroId: membroId as Id<"membros"> } : "skip",
  );

  const trimmedLen = texto.trim().length;
  const canSubmit =
    trimmedLen >= MIN_CHARS && !submitting && (scope !== "pg" || !!pgId);

  const reset = () => {
    setTexto("");
    setScope("church");
    setPgId(null);
    setAnonimo(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const id = await createMut({
        texto: texto.trim(),
        scope,
        pgId: scope === "pg" ? pgId ?? undefined : undefined,
        anonimo: scope !== "private" && anonimo,
      });
      toast.success("Pedido compartilhado");
      onCreated?.(id);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Novo pedido de oração</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Compartilhe seu pedido de oração..."
              className="w-full text-sm rounded-md border bg-background px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={5}
              style={{ minHeight: "120px" }}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                {trimmedLen < MIN_CHARS ? `Mínimo ${MIN_CHARS} caracteres` : ""}
              </span>
              {trimmedLen > WARN_CHARS && (
                <span>
                  {trimmedLen}/{MAX_CHARS}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Quem pode ver este pedido?
            </Label>
            <div className="flex flex-col gap-1.5">
              {SCOPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm text-left min-h-11 transition-colors",
                      active
                        ? "border-foreground bg-secondary font-medium"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {scope === "pg" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Qual PG?</Label>
              {meusPgs === undefined ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : meusPgs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Você não está em nenhum PG. Escolha outro escopo.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {meusPgs.map((pg) => {
                    const active = pgId === pg._id;
                    return (
                      <button
                        key={pg._id}
                        type="button"
                        onClick={() => setPgId(pg._id as Id<"pequenosGrupos">)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left min-h-11 transition-colors",
                          active
                            ? "border-foreground bg-secondary font-medium"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {pg.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {scope !== "private" && (
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  Compartilhar anonimamente
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Outros verão o pedido mas não saberão que foi você.
                </p>
              </div>
              <Switch checked={anonimo} onCheckedChange={setAnonimo} />
            </div>
          )}
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
            {submitting ? "Enviando..." : "Enviar pedido"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/* -------------------- Mobile (one question per page) -------------------- */

type Step = "texto" | "scope" | "pg" | "anonimo";

function MobileFlow({ open, onOpenChange, onCreated }: Props) {
  const { membroId } = useAuth();
  const [step, setStep] = useState<Step>("texto");
  const [texto, setTexto] = useState("");
  const [scope, setScope] = useState<Scope | null>(null);
  const [pgId, setPgId] = useState<Id<"pequenosGrupos"> | null>(null);
  const [anonimo, setAnonimo] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createMut = useMutation(api.pedidosOracao.mutations.createPrayerRequest);
  // @ts-ignore Convex TS2589
  const meusPgs = useQuery(
    api.pequenosGrupos.queries.listByMembro,
    membroId ? { membroId: membroId as Id<"membros"> } : "skip",
  );

  const textoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("texto");
      setTexto("");
      setScope(null);
      setPgId(null);
      setAnonimo(null);
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

  const steps: Step[] = (() => {
    const list: Step[] = ["texto", "scope"];
    if (scope === "pg") list.push("pg");
    if (scope && scope !== "private") list.push("anonimo");
    return list;
  })();

  const currentIndex = steps.indexOf(step);
  const isLastStep = currentIndex === steps.length - 1;
  const trimmedLen = texto.trim().length;

  const canAdvance = (() => {
    switch (step) {
      case "texto":
        return trimmedLen >= MIN_CHARS;
      case "scope":
        return !!scope;
      case "pg":
        return !!pgId;
      case "anonimo":
        return anonimo !== null;
    }
  })();

  const handleSubmit = async () => {
    if (!scope || submitting) return;
    setSubmitting(true);
    try {
      const id = await createMut({
        texto: texto.trim(),
        scope,
        pgId: scope === "pg" ? pgId ?? undefined : undefined,
        anonimo: scope !== "private" && !!anonimo,
      });
      toast.success("Pedido compartilhado");
      onCreated?.(id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
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
    setStep(steps[currentIndex + 1]);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      onOpenChange(false);
      return;
    }
    setStep(steps[currentIndex - 1]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-background flex flex-col"
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
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
          {steps.map((s, i) => (
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
        {step === "texto" && (
          <div className="flex flex-col gap-6 pt-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              O que pesa no seu coração?
            </h2>
            <textarea
              ref={textoRef}
              value={texto}
              onChange={(e) =>
                setTexto(e.target.value.slice(0, MAX_CHARS))
              }
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
              {trimmedLen > WARN_CHARS && (
                <span>
                  {trimmedLen}/{MAX_CHARS}
                </span>
              )}
            </div>
          </div>
        )}

        {step === "scope" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-medium leading-tight">
              Quem pode ver este pedido?
            </h2>
            <p className="text-sm text-muted-foreground">
              Você escolhe com quem compartilhar.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {SCOPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left min-h-14 transition-colors",
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border",
                    )}
                  >
                    <Icon
                      className="h-5 w-5 shrink-0 mt-0.5"
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

        {step === "pg" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-medium leading-tight">Qual PG?</h2>
            <p className="text-sm text-muted-foreground">
              Escolha o pequeno grupo que vai receber.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {meusPgs === undefined ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : meusPgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você não está em nenhum PG. Volte e escolha outro escopo.
                </p>
              ) : (
                meusPgs.map((pg) => {
                  const active = pgId === pg._id;
                  return (
                    <button
                      key={pg._id}
                      type="button"
                      onClick={() => setPgId(pg._id as Id<"pequenosGrupos">)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left min-h-14 transition-colors",
                        active
                          ? "border-foreground bg-secondary"
                          : "border-border",
                      )}
                    >
                      <span className="flex-1 text-sm font-medium">
                        {pg.nome}
                      </span>
                      {active && <Check className="h-5 w-5" aria-hidden />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === "anonimo" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-medium leading-tight">
              Compartilhar anonimamente?
            </h2>
            <p className="text-sm text-muted-foreground">
              Os outros verão o pedido, mas não saberão que foi você.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {[
                {
                  value: false,
                  label: "Com meu nome",
                  description: "Minha foto e nome aparecem no pedido.",
                },
                {
                  value: true,
                  label: "Anônimo",
                  description: "Aparece como \u201CPedido anônimo\u201D.",
                },
              ].map((opt) => {
                const active = anonimo === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setAnonimo(opt.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left min-h-14 transition-colors",
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border",
                    )}
                  >
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
      </div>

      <footer className="px-4 pt-2 pb-3 shrink-0">
        <Button
          onClick={handleNext}
          disabled={!canAdvance || submitting}
          className="w-full h-12 text-base bg-foreground text-background hover:bg-foreground/90"
        >
          {submitting
            ? "Enviando..."
            : isLastStep
              ? "Enviar pedido"
              : "Continuar"}
        </Button>
      </footer>
    </div>
  );
}
