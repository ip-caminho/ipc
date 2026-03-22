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
    <div className="bg-muted border border-border rounded-xl p-4">
      <p className="text-sm italic text-foreground leading-relaxed mb-3 line-clamp-3">
        &ldquo;{frase.frase}&rdquo;
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">{frase.pregador}</p>
          <p className="text-xs text-muted-foreground">{frase.titulo}</p>
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
