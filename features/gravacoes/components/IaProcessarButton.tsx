"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { Sparkles, RotateCcw, Loader2 } from "lucide-react";

interface IaProcessarButtonProps {
  gravacaoId: Id<"gravacoes">;
  iaStatus?: string | null;
  hasAudio: boolean;
}

export function IaProcessarButton({ gravacaoId, iaStatus, hasAudio }: IaProcessarButtonProps) {
  const startProcessing = useMutation(api.gravacoes.ai.startProcessing);

  if (!hasAudio) return null;

  const isProcessing = iaStatus === "PENDENTE" || iaStatus === "TRANSCREVENDO" || iaStatus === "ANALISANDO";
  const isRetry = iaStatus === "ERRO" || iaStatus === "CONCLUIDO";

  const handleProcess = async () => {
    try {
      await startProcessing({ id: gravacaoId });
      toast.success("Processamento com IA iniciado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar processamento");
    }
  };

  if (isProcessing) {
    return (
      <Button size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
        Processando...
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={isRetry ? "outline" : "default"}>
          {isRetry ? (
            <>
              <RotateCcw className="h-4 w-4 mr-1" />
              {iaStatus === "ERRO" ? "Tentar novamente" : "Reprocessar com IA"}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Processar com IA
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRetry ? "Reprocessar com IA?" : "Processar com IA?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRetry
              ? "O audio sera transcrito novamente e uma nova analise sera gerada. Os resultados anteriores serao substituidos."
              : "O audio sera transcrito automaticamente e uma analise teologica sera gerada com tema central, pontos-chave, frases para redes sociais e descricao para YouTube."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleProcess}>
            {isRetry ? "Reprocessar" : "Processar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
