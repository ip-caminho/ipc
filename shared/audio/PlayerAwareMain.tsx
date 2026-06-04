"use client";

import type { ReactNode } from "react";
import { useAudioPlayer } from "./useAudioPlayer";
import { ImpersonationBanner } from "@shared/components/layout/ImpersonationBanner";

export function PlayerAwareMain({ children }: { children: ReactNode }) {
  const { isActive } = useAudioPlayer();

  // Mobile: reserva espaco no rodape para a FloatingBottomBar (fixed) e, quando
  // tocando, o player overlay.
  const pb = isActive
    ? "calc(10rem + env(safe-area-inset-bottom, 0px))"
    : "calc(6rem + env(safe-area-inset-bottom, 0px))";

  return (
    <div
      // Desktop: a FloatingBottomBar e md:hidden e o GlobalAudioPlayer e sticky
      // (ja ocupa o fluxo), entao o padding-bottom inline so criaria vao em
      // branco -> md:pb-6! forca o padding normal em qualquer estado.
      className="relative flex-1 p-4 md:p-6 md:pb-6!"
      style={{ paddingBottom: pb }}
    >
      <ImpersonationBanner />
      {children}
    </div>
  );
}
