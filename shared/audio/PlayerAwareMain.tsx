"use client";

import type { ReactNode } from "react";

export function PlayerAwareMain({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">
      <div className="pointer-events-none sticky top-[-16px] -mx-4 h-6 z-10 bg-gradient-to-b from-background to-transparent md:hidden" />
      {children}
    </div>
  );
}
