"use client";

import { cn } from "@shared/lib/utils/cn";

interface LouvorCardProps {
  louvor: {
    _id: string;
    titulo: string;
    artista?: string;
    tom?: string;
    tags?: string[];
    status: string;
  };
  onClick?: () => void;
  active?: boolean;
  compact?: boolean;
}

export function LouvorCard({ louvor, onClick, active, compact }: LouvorCardProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted/50 truncate",
          active && "bg-muted font-medium",
        )}
      >
        {louvor.titulo}
        {louvor.artista && (
          <span className="text-muted-foreground ml-1.5">— {louvor.artista}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl border p-4 transition-colors hover:bg-muted/50",
        active && "ring-2 ring-primary bg-muted/50",
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{louvor.titulo}</span>
        {louvor.tom && (
          <span className="text-xs text-muted-foreground shrink-0">{louvor.tom}</span>
        )}
      </div>
      {louvor.artista && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{louvor.artista}</p>
      )}
    </div>
  );
}
