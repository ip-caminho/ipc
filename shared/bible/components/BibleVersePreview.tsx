"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";
import type { BibleVerseResult } from "../lib/lookup";

interface BibleVersePreviewProps {
  loading: boolean;
  results: BibleVerseResult[];
  error: string | null;
  maxHeight?: string;
  fontSize?: number;
}

function VersesText({ verses }: { verses: { number: number; text: string }[] }) {
  return (
    <>
      {verses.map((v) => (
        <span key={v.number}>
          <sup className="text-[10px] text-muted-foreground font-medium mr-0.5">
            {v.number}
          </sup>
          {v.text}{" "}
        </span>
      ))}
    </>
  );
}

function VerseBlock({ result, fontSize }: { result: BibleVerseResult; fontSize?: number }) {
  const hasCrossChapter = result.chapters && result.chapters.length > 1;

  return (
    <div>
      <p className="font-semibold text-muted-foreground" style={fontSize ? { fontSize: fontSize * 0.85 } : undefined}>
        {result.reference} (NAA)
      </p>
      <div className="leading-relaxed mt-1 break-words" style={fontSize ? { fontSize } : undefined}>
        {hasCrossChapter ? (
          result.chapters!.map((ch) => (
            <div key={ch.chapter} className="mt-1 first:mt-0">
              <span className="text-xs font-medium text-muted-foreground">
                Cap. {ch.chapter}
              </span>
              <div>
                <VersesText verses={ch.verses} />
              </div>
            </div>
          ))
        ) : (
          <VersesText verses={result.verses} />
        )}
      </div>
      {result.clamped && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          {result.clamped}
        </p>
      )}
    </div>
  );
}

export function BibleVersePreview({
  loading,
  results,
  error,
  maxHeight = "300px",
  fontSize,
}: BibleVersePreviewProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-muted-foreground italic p-3">{error}</p>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="space-y-3 p-3 overflow-y-auto" style={{ maxHeight }}>
      {results.map((r, i) => (
        <VerseBlock key={`${r.bookName}-${r.chapter}-${i}`} result={r} fontSize={fontSize} />
      ))}
    </div>
  );
}
