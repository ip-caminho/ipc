"use client";

import { motion, useReducedMotion } from "motion/react";
import { Download, Check, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@shared/lib/utils/cn";
import { useOfflineOpcional, type PedidoGuardar } from "@shared/offline/OfflineProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

const TAMANHO = 44; // tap target minimo no mobile
const RAIO = 15;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

function formatarMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Botao "Guardar para ouvir offline".
 *
 * O proprio botao e o indicador de progresso: um anel que se preenche com os
 * bytes que chegam. Sem barra separada e sem modal — o layout nao se mexe
 * durante o download.
 */
export function OfflineToggle({
  pedido,
  className,
}: {
  pedido: PedidoGuardar;
  className?: string;
}) {
  const offline = useOfflineOpcional();
  const reduzirMovimento = useReducedMotion();
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  if (!offline?.suportado) return null;

  const estado = offline.estadoDe(pedido.gravacaoId);
  const meta = offline.metas.find((m) => m.gravacaoId === pedido.gravacaoId);
  const baixando = estado.status === "baixando";
  const pronto = estado.status === "pronto";
  const indeterminado = baixando && estado.progresso < 0;
  const progresso = indeterminado ? 25 : Math.max(0, estado.progresso);

  const rotulo = baixando
    ? indeterminado
      ? "Baixando"
      : `Baixando, ${progresso}%`
    : pronto
      ? "Disponível offline. Toque para remover"
      : estado.status === "erro"
        ? "Falha ao baixar. Toque para tentar de novo"
        : "Guardar para ouvir offline";

  const aoClicar = async () => {
    if (baixando) return;
    if (pronto) {
      setConfirmandoRemocao(true);
      return;
    }
    const resultado = await offline.guardar(pedido);
    if (resultado.ok) {
      toast.success(
        resultado.bytes
          ? `Disponível offline · ${formatarMb(resultado.bytes)}`
          : "Disponível offline",
      );
    } else {
      toast.error("Não foi possível guardar o áudio", {
        description: "Verifique a conexão e o espaço do aparelho.",
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={aoClicar}
        disabled={baixando}
        aria-label={rotulo}
        title={rotulo}
        className={cn(
          "relative flex items-center gap-2 rounded-full text-muted-foreground",
          "transition-colors hover:text-foreground disabled:cursor-default",
          pronto && "text-primary hover:text-primary",
          estado.status === "erro" && "text-destructive hover:text-destructive",
          className,
        )}
      >
        <span
          className="relative inline-flex shrink-0 items-center justify-center"
          style={{ width: TAMANHO, height: TAMANHO }}
          role={baixando ? "progressbar" : undefined}
          aria-valuemin={baixando ? 0 : undefined}
          aria-valuemax={baixando ? 100 : undefined}
          aria-valuenow={baixando && !indeterminado ? progresso : undefined}
        >
          {/* Anel de progresso */}
          <svg
            width={TAMANHO}
            height={TAMANHO}
            viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
            className={cn(
              "absolute inset-0 -rotate-90",
              indeterminado && !reduzirMovimento && "animate-spin",
            )}
            aria-hidden="true"
          >
            {baixando && (
              <circle
                cx={TAMANHO / 2}
                cy={TAMANHO / 2}
                r={RAIO}
                fill="none"
                strokeWidth={2}
                className="stroke-muted"
              />
            )}
            {baixando && (
              <motion.circle
                cx={TAMANHO / 2}
                cy={TAMANHO / 2}
                r={RAIO}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={CIRCUNFERENCIA}
                initial={false}
                animate={{
                  strokeDashoffset: CIRCUNFERENCIA * (1 - progresso / 100),
                }}
                transition={
                  reduzirMovimento
                    ? { duration: 0 }
                    : { ease: "linear", duration: 0.25 }
                }
              />
            )}
          </svg>

          {/* Icone central */}
          {baixando ? (
            indeterminado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-[10px] font-medium tabular-nums">{progresso}</span>
            )
          ) : pronto ? (
            <motion.span
              initial={reduzirMovimento ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex"
            >
              <Check className="h-4 w-4" />
            </motion.span>
          ) : estado.status === "erro" ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </span>

        <span className="text-sm font-medium">
          {baixando
            ? "Baixando…"
            : pronto
              ? meta
                ? `Offline · ${formatarMb(meta.bytes)}`
                : "Offline"
              : estado.status === "erro"
                ? "Tentar de novo"
                : "Ouvir offline"}
        </span>
      </button>

      <AlertDialog open={confirmandoRemocao} onOpenChange={setConfirmandoRemocao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do aparelho?</AlertDialogTitle>
            <AlertDialogDescription>
              O áudio guardado será apagado. Você continua ouvindo online, e pode
              guardar de novo quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await offline.remover(pedido.gravacaoId);
                toast.success("Removido do aparelho");
              }}
            >
              <X className="h-4 w-4" />
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
