"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

interface IaStatusBadgeProps {
  iaStatus?: string | null;
  iaErro?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; animate?: boolean }> = {
  PENDENTE: { label: "IA: Pendente", variant: "secondary", animate: true },
  BAIXANDO: { label: "IA: Baixando audio", variant: "secondary", animate: true },
  TRANSCREVENDO: { label: "IA: Transcrevendo", variant: "secondary", animate: true },
  ANALISANDO: { label: "IA: Analisando", variant: "secondary", animate: true },
  CONCLUIDO: { label: "IA: Concluido", variant: "default" },
  ERRO: { label: "IA: Erro", variant: "destructive" },
};

export function IaStatusBadge({ iaStatus, iaErro }: IaStatusBadgeProps) {
  if (!iaStatus) return null;

  const config = STATUS_CONFIG[iaStatus];
  if (!config) return null;

  const badge = (
    <Badge variant={config.variant} className="gap-1">
      {config.animate && <Spinner className="size-3" />}
      {config.label}
    </Badge>
  );

  if (iaStatus === "ERRO" && iaErro) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{iaErro}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
