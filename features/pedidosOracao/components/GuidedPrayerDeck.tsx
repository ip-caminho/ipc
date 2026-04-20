"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { GuidedPrayerCard, type GuidedCardData } from "./GuidedPrayerCard";
import { GuidedPrayerComplete } from "./GuidedPrayerComplete";

interface Props {
  pedidos: GuidedCardData[];
}

function StackLayer({ depth }: { depth: number }) {
  const translateY = depth * 8;
  const scale = 1 - depth * 0.06;
  const opacity = depth === 1 ? 0.5 : 0.2;
  return (
    <motion.div
      aria-hidden
      initial={{ y: translateY, scale, opacity }}
      animate={{ y: translateY, scale, opacity }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 rounded-2xl bg-background border shadow-sm"
      style={{ zIndex: -depth }}
    />
  );
}

export function GuidedPrayerDeck({ pedidos }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [orouCount, setOrouCount] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const total = pedidos.length;

  const handleClose = useCallback(() => {
    if (confirm("Encerrar oração guiada?")) {
      router.push("/pedidos-oracao");
    }
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    const elements = [
      document.querySelector("main"),
      document.querySelector("nav"),
      document.querySelector("header"),
    ].filter(Boolean) as HTMLElement[];
    elements.forEach((el) => el.setAttribute("aria-hidden", "true"));
    return () => {
      elements.forEach((el) => el.removeAttribute("aria-hidden"));
    };
  }, []);

  if (total === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          Nenhum pedido de oração ativo.
        </p>
        <button
          type="button"
          onClick={() => router.push("/pedidos-oracao")}
          className="text-sm text-primary underline min-h-11"
        >
          Voltar ao mural
        </button>
      </div>
    );
  }

  const concluido = index >= total;

  return (
    <>
      <a
        href="#guided-prayer-end"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:p-2 focus:bg-background"
      >
        Pular para fim da oração guiada
      </a>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1 text-xs text-muted-foreground min-h-11 px-1 active:opacity-70 focus:outline-none focus:ring-2 focus:ring-ring rounded"
            aria-label="Encerrar oração guiada"
          >
            <X className="h-4 w-4" aria-hidden />
            Encerrar
          </button>
          <div className="flex-1" />
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {Math.min(index + 1, total)} de {total}
          </span>
        </header>

        <div className="px-4 flex items-center gap-1 shrink-0">
          {pedidos.map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-0.5 rounded-full bg-muted-foreground/20 overflow-hidden"
            >
              <motion.div
                className="h-full bg-foreground"
                initial={false}
                animate={{
                  width: i < index ? "100%" : "0%",
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </motion.div>
          ))}
        </div>

        <div
          className={cn(
            "flex-1 flex items-stretch justify-center p-4 overflow-hidden",
            concluido && "items-center",
          )}
        >
          {concluido ? (
            <div id="guided-prayer-end">
              <GuidedPrayerComplete
                total={orouCount}
                onRestart={() => {
                  setOrouCount(0);
                  setDirection(1);
                  setIndex(0);
                }}
              />
            </div>
          ) : (
            <div className="relative w-full max-w-md h-full mx-auto">
              {pedidos.slice(index + 1, index + 3).map((p, i) => (
                <StackLayer key={`${p._id}-${i}`} depth={i + 1} />
              ))}

              <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                <GuidedPrayerCard
                  key={pedidos[index]._id}
                  pedido={pedidos[index]}
                  direction={direction}
                  onAdvance={(orou) => {
                    if (orou) setOrouCount((c) => c + 1);
                    setDirection(1);
                    setIndex((i) => i + 1);
                  }}
                  onPrevious={() => {
                    if (index > 0) {
                      setDirection(-1);
                      setIndex((i) => i - 1);
                    }
                  }}
                />
              </AnimatePresence>
            </div>
          )}
        </div>

        {!concluido && (
          <p className="text-center text-[11px] text-muted-foreground pb-4 shrink-0">
            ← deslize para passar →
          </p>
        )}
      </div>
    </>
  );
}
