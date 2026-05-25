"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Play } from "lucide-react";
import { api } from "@/convex/_generated/api";

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ContinueListeningCard() {
  const data = useQuery(api.gravacoes.escutas.continuarOuvindo, {});

  if (!data) return null;

  const progressoPct = Math.min(100, Math.max(0, Math.round(data.progresso * 100)));

  return (
    <Link
      href={`/gravacoes/${data.gravacaoId}`}
      className="block rounded-xl p-4 active:opacity-90 transition-opacity bg-foreground"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-background/10 flex items-center justify-center">
          <Play className="h-4 w-4 text-background" fill="currentColor" strokeWidth={0} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium tracking-wider uppercase text-background/60">
            Continuar ouvindo
          </p>
          <p className="text-xs text-background font-medium truncate mt-0.5">
            {data.titulo}
          </p>
        </div>
        <span className="shrink-0 text-xs text-background/70 tabular-nums">
          {formatTime(data.ultimoSegundo)}
        </span>
      </div>
      <div className="mt-2 h-0.5 w-full rounded-full bg-background/15 overflow-hidden">
        <div
          className="h-full bg-background/80"
          style={{ width: `${progressoPct}%` }}
        />
      </div>
    </Link>
  );
}
