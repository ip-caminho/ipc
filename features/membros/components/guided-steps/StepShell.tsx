"use client";

import { Button } from "@/shared/components/ui/button";
import { Progress } from "@shared/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  percentage: number;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  saving?: boolean;
  hideActions?: boolean;
}

export function StepShell({
  title,
  subtitle,
  percentage,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = "Salvar e continuar",
  saving = false,
  hideActions = false,
}: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Progress value={percentage} className="h-1.5" />

      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="space-y-4">{children}</div>

      {!hideActions && (
        <div className="flex gap-2 pt-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} disabled={saving}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {onSkip && (
            <Button variant="outline" onClick={onSkip} disabled={saving} className="flex-1">
              Pular
            </Button>
          )}
          <Button onClick={onNext} disabled={saving} className="flex-1">
            {saving ? "Salvando..." : nextLabel}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
