"use client";

import { useCallback, useRef } from "react";
import { cn } from "@shared/lib/utils/cn";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface Props {
  letrasComMembros: Set<string>;
  onSelectLetter: (letter: string) => void;
}

export function AlphabetScrubber({ letrasComMembros, onSelectLetter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLetterRef = useRef<string | null>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const idx = Math.max(
        0,
        Math.min(ALPHABET.length - 1, Math.floor((y / rect.height) * ALPHABET.length)),
      );
      const letter = ALPHABET[idx];
      if (
        letrasComMembros.has(letter) &&
        activeLetterRef.current !== letter
      ) {
        activeLetterRef.current = letter;
        onSelectLetter(letter);
      }
    },
    [letrasComMembros, onSelectLetter],
  );

  return (
    <div
      ref={containerRef}
      role="navigation"
      aria-label="Navegação alfabética"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        activeLetterRef.current = null;
        handlePointerMove(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 0) return;
        handlePointerMove(e);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        activeLetterRef.current = null;
      }}
      className="fixed right-1 top-1/2 -translate-y-1/2 z-40 flex flex-col select-none touch-none md:hidden"
      style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      {ALPHABET.map((letter) => {
        const has = letrasComMembros.has(letter);
        return (
          <button
            key={letter}
            type="button"
            onClick={() => has && onSelectLetter(letter)}
            disabled={!has}
            aria-label={`Ir para ${letter}`}
            className={cn(
              "px-1 leading-tight text-[9px]",
              has ? "text-primary font-medium" : "text-muted-foreground opacity-30",
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
