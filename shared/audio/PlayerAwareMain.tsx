"use client";

import type { ReactNode } from "react";
import { useAudioPlayer } from "./useAudioPlayer";
import { ImpersonationBanner } from "@shared/components/layout/ImpersonationBanner";

export function PlayerAwareMain({ children }: { children: ReactNode }) {
  const { isActive } = useAudioPlayer();

  const pb = isActive
    ? "calc(10rem + env(safe-area-inset-bottom, 0px))"
    : "calc(6rem + env(safe-area-inset-bottom, 0px))";

  return (
    <div
      className="relative flex-1 p-4 md:p-6 md:pb-6"
      style={{ paddingBottom: pb }}
    >
      <ImpersonationBanner />
      {children}
    </div>
  );
}
