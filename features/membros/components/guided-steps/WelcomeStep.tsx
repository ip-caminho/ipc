"use client";

import { Button } from "@/shared/components/ui/button";
import { Progress } from "@shared/components/ui/progress";
import { User, ArrowRight } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

interface Props {
  firstName: string;
  percentage: number;
  missingLabels: string[];
  onStart: () => void;
}

export function WelcomeStep({ firstName, percentage, missingLabels, onStart }: Props) {
  const color =
    percentage > 80
      ? "text-emerald-600"
      : percentage >= 50
        ? "text-amber-600"
        : "text-red-600";

  const progressColor =
    percentage > 80
      ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
      : percentage >= 50
        ? "[&_[data-slot=progress-indicator]]:bg-amber-500"
        : "[&_[data-slot=progress-indicator]]:bg-red-500";

  return (
    <div className="space-y-6 py-4 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vamos completar seu perfil, {firstName}</h1>
          <p className={cn("text-2xl font-bold mt-1", color)}>{percentage}%</p>
        </div>
      </div>

      <Progress value={percentage} className={cn("h-2", progressColor)} />

      {missingLabels.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Faltam preencher:</p>
          <div className="flex flex-wrap gap-1.5">
            {missingLabels.map((label) => (
              <span
                key={label}
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button className="w-full" size="lg" onClick={onStart}>
        {percentage === 0 ? "Comecar" : "Continuar"}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
