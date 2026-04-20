"use client";

import { motion } from "motion/react";
import Link from "next/link";

interface Props {
  total: number;
  onRestart: () => void;
}

const VERSICULO = {
  texto: "Orai sem cessar.",
  ref: "1 Tessalonicenses 5:17",
};

export function GuidedPrayerComplete({ total, onRestart }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="flex flex-col items-center justify-center gap-6 py-12 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Tempo de oração concluído
        </span>
        <h1 className="text-xl font-medium leading-snug">
          Você orou por {total} {total === 1 ? "pedido" : "pedidos"} hoje.
        </h1>
      </div>

      <blockquote className="max-w-xs mx-auto flex flex-col gap-2">
        <p className="text-[15px] leading-relaxed italic text-foreground">
          &ldquo;{VERSICULO.texto}&rdquo;
        </p>
        <cite className="text-[11px] not-italic text-muted-foreground">
          {VERSICULO.ref}
        </cite>
      </blockquote>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link
          href="/pedidos-oracao"
          className="w-full flex items-center justify-center h-12 rounded-xl bg-foreground text-background font-medium text-sm min-h-[48px] active:opacity-90"
        >
          Voltar ao mural
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="text-xs text-muted-foreground min-h-11 active:opacity-70"
        >
          Orar de novo do início
        </button>
      </div>
    </motion.div>
  );
}
