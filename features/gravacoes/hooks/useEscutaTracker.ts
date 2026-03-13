"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRef, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds

export function useEscutaTracker(gravacaoId: Id<"gravacoes">) {
  // @ts-ignore Convex TS2589
  const heartbeat = useMutation(api.gravacoes.escutas.heartbeat);
  // @ts-ignore Convex TS2589
  const escuta = useQuery(api.gravacoes.escutas.getMyProgress, { gravacaoId });
  const lastSentRef = useRef(0);

  const onTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      const now = Date.now();
      if (now - lastSentRef.current < HEARTBEAT_INTERVAL) return;
      lastSentRef.current = now;

      heartbeat({ gravacaoId, currentTime: Math.round(currentTime), duration: Math.round(duration) }).catch(() => {
        // Silently ignore — non-critical
      });
    },
    [gravacaoId, heartbeat]
  );

  return {
    onTimeUpdate,
    ultimoSegundo: escuta?.ultimoSegundo ?? null,
    completou: escuta?.completou ?? false,
  };
}
