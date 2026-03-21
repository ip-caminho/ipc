"use client";

import type { ReactNode } from "react";

export function PlayerAwareMain({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      {children}
    </div>
  );
}
