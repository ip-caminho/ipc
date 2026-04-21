"use client";

import type { ReactNode } from "react";
import { ImpersonationBanner } from "@shared/components/layout/ImpersonationBanner";

/**
 * Wrapper do conteúdo principal das rotas autenticadas.
 *
 * Scroll é do documento (html/body). Este elemento apenas fornece padding
 * e compensa a altura do FloatingBottomBar flutuante + safe area inferior.
 */
export function PlayerAwareMain({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex-1 p-4 md:p-6 md:pb-6"
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <ImpersonationBanner />
      {children}
    </div>
  );
}
