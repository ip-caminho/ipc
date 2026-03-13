"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { Quote, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export function FrasesCarrossel() {
  // @ts-ignore Convex TS2589
  const allFrases = useQuery(api.gravacoes.queries.listFrases);
  const [index, setIndex] = useState(0);
  const [shuffled, setShuffled] = useState<{ frase: string; pregador: string; titulo: string; gravacaoId: string }[]>([]);

  // Shuffle on load
  useEffect(() => {
    if (!allFrases || allFrases.length === 0) return;
    const copy = [...allFrases];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setShuffled(copy);
    setIndex(0);
  }, [allFrases]);

  const next = useCallback(() => {
    if (shuffled.length === 0) return;
    setIndex((i) => (i + 1) % shuffled.length);
  }, [shuffled.length]);

  const prev = useCallback(() => {
    if (shuffled.length === 0) return;
    setIndex((i) => (i - 1 + shuffled.length) % shuffled.length);
  }, [shuffled.length]);

  // Auto-rotate every 10s
  useEffect(() => {
    if (shuffled.length <= 1) return;
    const interval = setInterval(next, 20000);
    return () => clearInterval(interval);
  }, [shuffled.length, next]);

  if (!allFrases || allFrases.length === 0) return null;
  if (shuffled.length === 0) return null;

  const current = shuffled[index];

  return (
    <div className="py-6 px-2 relative">
        <div className="max-w-md mx-auto flex flex-col justify-center text-center">
          <p className="text-sm leading-relaxed italic">
            <Quote className="h-3.5 w-3.5 text-muted-foreground/30 inline mr-1 -mt-0.5" />
            {current.frase}
          </p>
          <p className="text-xs text-muted-foreground mt-1">— {current.pregador}</p>
          <div className="mt-3">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
              <Link href={`/gravacoes/${current.gravacaoId}`}>
                <Headphones className="h-3 w-3" />
                Ouvir pregacao
              </Link>
            </Button>
          </div>
        </div>

        {shuffled.length > 1 && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 pointer-events-auto opacity-40 hover:opacity-100"
              onClick={prev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 pointer-events-auto opacity-40 hover:opacity-100"
              onClick={next}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
    </div>
  );
}
