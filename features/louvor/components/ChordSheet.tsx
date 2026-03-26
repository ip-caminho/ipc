"use client";

import { useMemo } from "react";
import { renderLines } from "../lib/chordpro";

interface ChordSheetProps {
  conteudo: string;
  showChords: boolean;
  transposeSemitones?: number;
  fontSize?: number;
}

export function ChordSheet({
  conteudo,
  showChords,
  transposeSemitones = 0,
  fontSize = 16,
}: ChordSheetProps) {
  const lines = useMemo(() => {
    if (!conteudo) return [];
    return renderLines(conteudo, showChords, transposeSemitones);
  }, [conteudo, showChords, transposeSemitones]);

  if (!conteudo) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhum conteudo cadastrado
      </p>
    );
  }

  return (
    <div className="font-mono leading-relaxed overflow-x-auto" style={{ fontSize: `${fontSize}px` }}>
      {lines.map((line, i) => {
        if (line.type === "empty") {
          return <div key={i} className="h-[1em]" />;
        }

        if (line.type === "chord") {
          return (
            <pre key={i} className="text-blue-600 dark:text-blue-400 font-bold whitespace-pre">
              {line.text}
            </pre>
          );
        }

        if (line.type === "section") {
          return (
            <pre key={i} className="text-muted-foreground font-semibold whitespace-pre mt-2">
              {line.text}
            </pre>
          );
        }

        return (
          <pre key={i} className="whitespace-pre">
            {line.text}
          </pre>
        );
      })}
    </div>
  );
}
