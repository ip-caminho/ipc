"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Check, AlertCircle, Sparkles, RotateCcw } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@shared/lib/utils/cn";
import { toast } from "sonner";

interface IaProgressPanelProps {
  gravacaoId: Id<"gravacoes">;
  iaStatus?: string | null;
  iaErro?: string | null;
  iaTranscricao?: string | null;
  youtubeUrl?: string | null;
  audioUrl?: string | null;
}

type StepKey = "BAIXANDO" | "TRANSCREVENDO" | "ANALISANDO" | "CONCLUIDO";

interface Step {
  key: StepKey;
  label: string;
}

const ALL_STEPS: Step[] = [
  { key: "BAIXANDO", label: "Baixando audio do YouTube" },
  { key: "TRANSCREVENDO", label: "Transcrevendo audio" },
  { key: "ANALISANDO", label: "Analisando conteudo" },
  { key: "CONCLUIDO", label: "Concluido" },
];

function getVisibleSteps(isYoutube: boolean): Step[] {
  if (isYoutube) return ALL_STEPS;
  return ALL_STEPS.filter((s) => s.key !== "BAIXANDO");
}

function getStepPercent(stepIdx: number, totalSteps: number): number {
  return Math.round(((stepIdx + 1) / totalSteps) * 100);
}

type RetryableStep = "BAIXANDO" | "TRANSCREVENDO" | "ANALISANDO";

function detectFailedStep(iaTranscricao?: string | null, youtubeUrl?: string | null, audioUrl?: string | null): RetryableStep {
  if (youtubeUrl && !audioUrl) return "BAIXANDO";
  return iaTranscricao ? "ANALISANDO" : "TRANSCREVENDO";
}

export function IaProgressPanel({ gravacaoId, iaStatus, iaErro, iaTranscricao, youtubeUrl, audioUrl }: IaProgressPanelProps) {
  const startProcessing = useMutation(api.gravacoes.ai.startProcessing);

  if (!iaStatus || iaStatus === "CONCLUIDO") return null;

  const isYoutube = !!youtubeUrl;
  const steps = getVisibleSteps(isYoutube);
  const isProcessing = iaStatus === "PENDENTE" || iaStatus === "BAIXANDO" || iaStatus === "TRANSCREVENDO" || iaStatus === "ANALISANDO";
  const hasError = iaStatus === "ERRO";
  const failedStep = hasError ? detectFailedStep(iaTranscricao, youtubeUrl, audioUrl) : null;

  const handleRetry = async () => {
    if (!failedStep) return;
    try {
      await startProcessing({ id: gravacaoId, retryFrom: failedStep });
      toast.success("Retomando processamento...");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao retomar");
    }
  };

  if (hasError) {
    const failedIdx = steps.findIndex((s) => s.key === failedStep);
    const failedLabel = steps[failedIdx]?.label ?? "Processamento";
    const failedPercent = failedIdx >= 0 ? getStepPercent(failedIdx, steps.length) : 0;

    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">Erro no processamento</p>
          </div>

          <Progress value={failedPercent} className="h-2" />

          <div className="space-y-2">
            {steps.map((step, stepIdx) => {
              const isDone = stepIdx < failedIdx;
              const isFailed = step.key === failedStep;

              return (
                <div key={step.key} className="flex items-center gap-2">
                  {isDone && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  {isFailed && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  {!isDone && !isFailed && <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/20 shrink-0" />}
                  <span className={cn(
                    "text-xs",
                    isDone && "text-muted-foreground",
                    isFailed && "text-destructive font-medium",
                    !isDone && !isFailed && "text-muted-foreground/40",
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {iaErro && (
            <p className="text-xs text-destructive/80 bg-destructive/5 rounded p-2">{iaErro}</p>
          )}

          <Button size="sm" variant="outline" onClick={handleRetry} className="w-full">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Tentar novamente — {failedLabel.toLowerCase()}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Processing state
  const currentIdx = steps.findIndex((s) => s.key === iaStatus);
  // PENDENTE maps to the first step (BAIXANDO for YouTube, TRANSCREVENDO for upload)
  const activeIdx = iaStatus === "PENDENTE" ? 0 : currentIdx;
  const currentStep = Math.max(activeIdx + 1, 1);
  const progress = activeIdx >= 0 ? getStepPercent(activeIdx, steps.length) : 10;
  const label = iaStatus === "PENDENTE" ? "Preparando..." : (steps[activeIdx]?.label ?? "");

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-sm font-medium">Processando com IA</p>
          </div>
          <span className="text-xs text-muted-foreground">
            Etapa {currentStep} de {steps.length}
          </span>
        </div>

        <div className="space-y-1.5">
          <Progress value={progress} className="h-2 transition-all duration-700" />
          <div className="flex items-center gap-2">
            <Spinner className="size-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {steps.map((step, stepIdx) => {
            const isDone = stepIdx < activeIdx;
            const isActive = stepIdx === activeIdx;

            return (
              <div key={step.key} className="flex items-center gap-2">
                {isDone && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                {isActive && <Spinner className="size-3.5 text-primary shrink-0" />}
                {!isDone && !isActive && <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/20 shrink-0" />}
                <span className={cn(
                  "text-xs",
                  isDone && "text-muted-foreground",
                  isActive && "text-foreground font-medium",
                  !isDone && !isActive && "text-muted-foreground/40",
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
