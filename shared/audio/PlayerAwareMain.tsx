"use client";

import type { ReactNode } from "react";
import { useAudioPlayer } from "./useAudioPlayer";
import { ImpersonationBanner } from "@shared/components/layout/ImpersonationBanner";
import { cn } from "@shared/lib/utils/cn";

export function PlayerAwareMain({ children }: { children: ReactNode }) {
  const { isActive } = useAudioPlayer();

  // No mobile reservamos espaco para a FloatingBottomBar (e o player, quando ativo).
  const pb = isActive
    ? "calc(10rem + env(safe-area-inset-bottom, 0px))"
    : "calc(6rem + env(safe-area-inset-bottom, 0px))";

  return (
    <div
      className={cn(
        "relative flex-1 p-4 md:p-6",
        // No desktop a FloatingBottomBar fica oculta; sem player ativo o
        // padding-bottom inline deixaria um vao em branco -> forca o normal.
        !isActive && "md:pb-6!",
      )}
      style={{ paddingBottom: pb }}
    >
      <ImpersonationBanner />
      {children}
    </div>
  );
}
