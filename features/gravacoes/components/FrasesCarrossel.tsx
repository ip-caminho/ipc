"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";
import Link from "next/link";

export function FrasesCarrossel() {
  // @ts-ignore Convex TS2589
  const allFrases = useQuery(api.gravacoes.queries.listFrases);

  const frase = useMemo(() => {
    if (!allFrases || allFrases.length === 0) return null;
    return allFrases[Math.floor(Math.random() * allFrases.length)];
  }, [allFrases]);

  if (!frase) return null;

  return (
    <div className="relative overflow-hidden px-4 py-6 md:px-12 md:py-10">
      {/* Aspas decorativas */}
      <span className="pointer-events-none absolute top-4 left-5 text-6xl md:text-8xl font-serif leading-none text-foreground/[0.06] select-none">
        &ldquo;
      </span>
      <span className="pointer-events-none absolute bottom-4 right-5 text-6xl md:text-8xl font-serif leading-none text-foreground/[0.06] select-none">
        &rdquo;
      </span>

      <blockquote className="relative z-10 mb-5">
        <p className="text-base md:text-lg font-serif italic text-foreground/90 leading-relaxed tracking-wide">
          {frase.frase}
        </p>
      </blockquote>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-foreground/20" />
          <div>
            <p className="text-sm font-medium text-foreground">{frase.pregador}</p>
            <p className="text-xs text-muted-foreground">{frase.titulo}</p>
          </div>
        </div>
        <Link
          href={`/gravacoes/${frase.gravacaoId}`}
          className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150"
        >
          Ouvir pregacao
        </Link>
      </div>
    </div>
  );
}
