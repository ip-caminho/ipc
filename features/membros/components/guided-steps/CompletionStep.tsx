"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@shared/components/ui/progress";
import { Check } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

interface Props {
  firstName: string;
  percentage: number;
}

export function CompletionStep({ firstName, percentage }: Props) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/meu-perfil"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  const color =
    percentage === 100
      ? "text-emerald-600"
      : percentage > 80
        ? "text-emerald-600"
        : "text-amber-600";

  const progressColor =
    percentage >= 80
      ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
      : "[&_[data-slot=progress-indicator]]:bg-amber-500";

  return (
    <div className="flex flex-col items-center text-center gap-5 py-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">
          {percentage === 100 ? "Perfil completo!" : `Otimo trabalho, ${firstName}!`}
        </h2>
        <p className={cn("text-2xl font-bold mt-1", color)}>{percentage}%</p>
      </div>
      <Progress value={percentage} className={cn("h-2 w-full", progressColor)} />
      <p className="text-sm text-muted-foreground">Voltando ao perfil...</p>
    </div>
  );
}
