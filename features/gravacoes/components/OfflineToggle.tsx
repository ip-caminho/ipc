"use client";

import { motion, useReducedMotion } from "motion/react";
import { Download, Check, Loader2, RotateCcw, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@shared/lib/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { useOfflineOpcional, type PedidoGuardar } from "@shared/offline/OfflineProvider";
import { RETENCAO_DIAS } from "@shared/offline/db";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";

const TAMANHO = 48; // mesmo diametro do botao de play, ao lado
const RAIO = 21;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

function formatarMb(bytes: number): string {
  // Decimal com virgula: e texto que o membro le, nao numero de log.
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Botao "ouvir offline" — so no mobile, ao lado do play.
 *
 * O proprio botao e o indicador de progresso: um anel que se preenche com os
 * bytes que chegam, sem barra separada e sem mexer no layout. Tocar abre um
 * Drawer que explica como usar antes de baixar (e como remover, depois).
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
  const [aberto, setAberto] = useState(false);

  if (!offline?.suportado) return null;

  const estado = offline.estadoDe(pedido.gravacaoId);
  const meta = offline.metas.find((m) => m.gravacaoId === pedido.gravacaoId);
  const baixando = estado.status === "baixando";
  const pronto = estado.status === "pronto";
  const erro = estado.status === "erro";
  const indeterminado = baixando && estado.progresso < 0;
  const progresso = indeterminado ? 25 : Math.max(0, estado.progresso);

  const rotuloBotao = baixando
    ? indeterminado
      ? "Baixando a pregação"
      : `Baixando a pregação, ${progresso}%`
    : pronto
      ? "Pregação guardada no aparelho"
      : erro
        ? "Falha ao guardar. Toque para ver"
        : "Ouvir sem internet";

  const guardar = async () => {
    const resultado = await offline.guardar(pedido);
    if (resultado.ok) {
      toast.success(
        resultado.bytes
          ? `Guardado no aparelho · ${formatarMb(resultado.bytes)}`
          : "Guardado no aparelho",
      );
    } else {
      toast.error("Não foi possível guardar a pregação", {
        description: "Verifique a conexão e o espaço do aparelho.",
      });
    }
  };

  return (
    <>
      {/* Só no mobile: no desktop não há metrô nem limite de dados. */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={rotuloBotao}
        title={rotuloBotao}
        className={cn(
          "md:hidden relative shrink-0 rounded-full transition-colors",
          "flex items-center justify-center active:opacity-80",
          pronto ? "text-primary" : erro ? "text-destructive" : "text-muted-foreground",
          className,
        )}
        style={{ width: TAMANHO, height: TAMANHO }}
        role={baixando ? "progressbar" : undefined}
        aria-valuemin={baixando ? 0 : undefined}
        aria-valuemax={baixando ? 100 : undefined}
        aria-valuenow={baixando && !indeterminado ? progresso : undefined}
      >
        {/* Contorno do botao: fecha quando o audio esta guardado. */}
        <span
          className={cn(
            "absolute inset-[2px] rounded-full border transition-colors",
            pronto ? "border-primary/40 bg-primary/10" : "border-border",
          )}
        />

        {/* Anel de progresso */}
        {baixando && (
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
            <circle
              cx={TAMANHO / 2}
              cy={TAMANHO / 2}
              r={RAIO}
              fill="none"
              strokeWidth={2}
              className="stroke-muted"
            />
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
              animate={{ strokeDashoffset: CIRCUNFERENCIA * (1 - progresso / 100) }}
              transition={
                reduzirMovimento ? { duration: 0 } : { ease: "linear", duration: 0.25 }
              }
            />
          </svg>
        )}

        <span className="relative inline-flex items-center justify-center">
          {baixando ? (
            indeterminado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-[11px] font-medium tabular-nums">{progresso}</span>
            )
          ) : pronto ? (
            <motion.span
              initial={reduzirMovimento ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex"
            >
              <Check className="h-5 w-5" />
            </motion.span>
          ) : erro ? (
            <RotateCcw className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </span>
      </button>

      <Drawer open={aberto} onOpenChange={setAberto}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              <WifiOff className="h-5 w-5 text-primary" />
              {pronto ? "Guardado no aparelho" : "Ouvir sem internet"}
            </DrawerTitle>
            <DrawerDescription>
              {pronto
                ? "Esta pregação já está no seu celular. Toque em Ouvir e ela toca mesmo sem sinal — no metrô, no avião, onde a rede não chega."
                : "Guarde a pregação no seu celular para ouvir onde não há sinal, sem gastar dados."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  1
                </span>
                <span>
                  {pronto ? (
                    <>Já feito: a pregação foi baixada no Wi-Fi.</>
                  ) : (
                    <>Toque em <strong className="text-foreground">Guardar no aparelho</strong>, de preferência no Wi-Fi.</>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  2
                </span>
                <span>
                  Antes de entrar no metrô, deixe o app aberto ou em segundo plano —
                  ainda não dá para abrir o app do zero sem internet.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  3
                </span>
                <span>
                  Toque em <strong className="text-foreground">Ouvir</strong> normalmente. O áudio
                  sai do seu celular, e funciona com a tela bloqueada.
                </span>
              </li>
            </ol>

            <p className="mt-4 text-xs text-muted-foreground">
              {meta
                ? `Ocupa ${formatarMb(meta.bytes)}. `
                : "Guarda só o trecho da pregação, não o culto inteiro. "}
              É apagado sozinho depois de {RETENCAO_DIAS} dias sem uso, e você pode
              remover quando quiser.
            </p>
          </div>

          <DrawerFooter>
            {pronto ? (
              <>
                <Button
                  variant="outline"
                  className="h-11 text-destructive hover:text-destructive"
                  onClick={async () => {
                    await offline.remover(pedido.gravacaoId);
                    setAberto(false);
                    toast.success("Removido do aparelho");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover do aparelho
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" className="h-11">
                    Fechar
                  </Button>
                </DrawerClose>
              </>
            ) : (
              <>
                <Button
                  className="h-11"
                  disabled={baixando}
                  onClick={async () => {
                    setAberto(false);
                    await guardar();
                  }}
                >
                  {baixando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Baixando…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {erro ? "Tentar de novo" : "Guardar no aparelho"}
                    </>
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" className="h-11">
                    Agora não
                  </Button>
                </DrawerClose>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
