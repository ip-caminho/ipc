"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils/cn";

interface SectionLabelProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionLabel({ children, action, className }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h2>
      {action && <div className="flex items-center">{action}</div>}
    </div>
  );
}
