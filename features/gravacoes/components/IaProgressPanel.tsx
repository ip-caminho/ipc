"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Check, Loader2, Circle, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

interface IaProgressPanelProps {
  iaStatus?: string | null;
  iaErro?: string | null;
}

interface Step {
  key: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  {
    key: "PENDENTE",
    label: "Iniciando",
    description: "Preparando o processamento do audio...",
  },
  {
    key: "TRANSCREVENDO",
    label: "Transcrevendo audio",
    description: "Convertendo o audio em texto com inteligencia artificial. Isso pode levar alguns minutos dependendo da duracao.",
  },
  {
    key: "ANALISANDO",
    label: "Analisando conteudo",
    description: "Extraindo titulo, resumo, texto base, frases para redes sociais e descricao para YouTube.",
  },
  {
    key: "CONCLUIDO",
    label: "Concluido",
    description: "Todos os campos foram preenchidos automaticamente. Revise e edite se necessario.",
  },
];

function getStepState(stepKey: string, currentStatus: string, hasError: boolean): "done" | "active" | "pending" | "error" {
  const stepIndex = STEPS.findIndex((s) => s.key === stepKey);
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  if (hasError && stepKey === currentStatus) return "error";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

function StepIcon({ state }: { state: "done" | "active" | "pending" | "error" }) {
  if (state === "done") return <Check className="h-4 w-4 text-primary" />;
  if (state === "active") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (state === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

export function IaProgressPanel({ iaStatus, iaErro }: IaProgressPanelProps) {
  if (!iaStatus) return null;

  const isProcessing = iaStatus === "PENDENTE" || iaStatus === "TRANSCREVENDO" || iaStatus === "ANALISANDO";
  const hasError = iaStatus === "ERRO";

  // Don't show the panel when completed — results are shown in IaResultadoDisplay
  if (iaStatus === "CONCLUIDO") return null;

  // For error state, find which step failed (default to the last active one)
  const errorStep = hasError ? "ANALISANDO" : "";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">
            {isProcessing ? "Processando com IA..." : hasError ? "Erro no processamento" : "Processamento IA"}
          </p>
        </div>

        <div className="space-y-4">
          {STEPS.filter((s) => s.key !== "CONCLUIDO").map((step, i) => {
            const state = hasError
              ? getStepState(step.key, errorStep, step.key === errorStep)
              : getStepState(step.key, iaStatus!, false);

            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border",
                    state === "done" && "border-primary bg-primary/10",
                    state === "active" && "border-primary bg-primary/5",
                    state === "error" && "border-destructive bg-destructive/10",
                    state === "pending" && "border-muted-foreground/20",
                  )}>
                    <StepIcon state={state} />
                  </div>
                  {i < 2 && (
                    <div className={cn(
                      "w-px flex-1 min-h-4 mt-1",
                      state === "done" ? "bg-primary/40" : "bg-muted-foreground/15",
                    )} />
                  )}
                </div>
                <div className="pb-2">
                  <p className={cn(
                    "text-sm font-medium",
                    state === "pending" && "text-muted-foreground/50",
                    state === "error" && "text-destructive",
                  )}>
                    {step.label}
                  </p>
                  {(state === "active" || state === "error") && (
                    <p className={cn(
                      "text-xs mt-0.5",
                      state === "error" ? "text-destructive/80" : "text-muted-foreground",
                    )}>
                      {state === "error" && iaErro ? iaErro : step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
