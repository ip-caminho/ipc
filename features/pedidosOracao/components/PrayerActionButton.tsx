"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { HandHeart } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { haptic } from "@shared/lib/haptic";

interface PrayerActionButtonProps {
  pedidoId: Id<"pedidosOracao">;
  euOrando: boolean;
  size?: "sm" | "md";
}

/**
 * Botao Orar/Parar com otimistic update.
 * Chama togglePrayer — o servidor mantem qtdOrando e ultimaAtividadeEm em sync.
 */
export function PrayerActionButton({
  pedidoId,
  euOrando,
  size = "sm",
}: PrayerActionButtonProps) {
  const toggle = useMutation(api.pedidosOracao.mutations.togglePrayer);
  const [pending, setPending] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const current = optimistic ?? euOrando;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    haptic(20);
    setPending(true);
    setOptimistic(!current);
    try {
      await toggle({ pedidoId });
    } catch {
      setOptimistic(current); // reverte
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "shrink-0 rounded-full font-medium transition-colors",
        size === "md" ? "h-11 px-5 text-sm" : "h-8 px-3 text-xs",
        current
          ? "border text-muted-foreground"
          : "bg-blue-600 text-white hover:bg-blue-700 active:opacity-90",
      )}
      aria-pressed={current}
    >
      <span className="inline-flex items-center gap-1.5">
        <HandHeart className="h-3.5 w-3.5" aria-hidden />
        {current ? "Parar" : "Orar"}
      </span>
    </button>
  );
}
