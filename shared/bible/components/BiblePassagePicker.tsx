"use client";

import { useState, useEffect, useCallback } from "react";
import { BIBLE } from "../data/books";
import { loadBibleData, type BibleData } from "../lib/loader";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { Button } from "@/shared/components/ui/button";

type Step = "book" | "chapter" | "verse";

interface BiblePassagePickerProps {
  onSelect: (reference: string) => void;
}

export function BiblePassagePicker({ onSelect }: BiblePassagePickerProps) {
  const [step, setStep] = useState<Step>("book");
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verseStart, setVerseStart] = useState<number | null>(null);
  const [bibleData, setBibleData] = useState<BibleData | null>(null);

  useEffect(() => {
    loadBibleData().then(setBibleData).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    setStep("book");
    setBook(null);
    setChapter(null);
    setVerseStart(null);
  }, []);

  const goBack = () => {
    if (step === "verse") {
      setChapter(null);
      setVerseStart(null);
      setStep("chapter");
    } else if (step === "chapter") {
      setBook(null);
      setStep("book");
    }
  };

  const confirmSelection = () => {
    if (!book || !chapter) return;
    if (!verseStart) {
      onSelect(`${book} ${chapter}`);
    } else {
      onSelect(`${book} ${chapter}:${verseStart}`);
    }
    reset();
  };

  const handleSelectVerse = (v: number) => {
    if (verseStart === null) {
      // Primeiro toque — seleciona início
      setVerseStart(v);
    } else if (v === verseStart) {
      // Toque no mesmo — confirma versículo único
      onSelect(`${book} ${chapter}:${v}`);
      reset();
    } else {
      // Segundo toque — confirma range
      const from = Math.min(verseStart, v);
      const to = Math.max(verseStart, v);
      const ref = from === to
        ? `${book} ${chapter}:${from}`
        : `${book} ${chapter}:${from}-${to}`;
      onSelect(ref);
      reset();
    }
  };

  const chapterCount = book && bibleData
    ? Object.keys(bibleData[book] || {}).length
    : 0;

  const verseCount = book && chapter && bibleData
    ? Object.keys(bibleData[book]?.[String(chapter)] || {}).length
    : 0;

  const breadcrumb = step === "book" ? "Livro"
    : step === "chapter" ? book
    : `${book} ${chapter}`;

  return (
    <div className="space-y-2">
      {/* Header */}
      {step !== "book" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors min-h-[36px] min-w-[36px] justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{breadcrumb}</span>
        </div>
      )}

      {/* Livros */}
      {step === "book" && (
        <div className="max-h-[40vh] overflow-y-auto space-y-3">
          {BIBLE.map((testament) => (
            <div key={testament.key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                {testament.key}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {testament.sections.flatMap((s) => s.books).map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => { setBook(b.name); setStep("chapter"); }}
                    className="px-2.5 py-1.5 text-sm rounded-md bg-muted hover:bg-accent transition-colors"
                  >
                    {b.abbr}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Capítulos */}
      {step === "chapter" && (
        <div className="max-h-[40vh] overflow-y-auto">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => { setChapter(ch); setVerseStart(null); setStep("verse"); }}
                className="h-10 text-sm rounded-md bg-muted hover:bg-accent transition-colors font-medium"
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Versículos */}
      {step === "verse" && (
        <div className="max-h-[40vh] overflow-y-auto space-y-3">
          <p className="text-xs text-muted-foreground">
            {verseStart === null
              ? "Toque no versículo inicial"
              : `Versículo ${verseStart} selecionado — toque no final ou confirme`}
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => {
              const isStart = v === verseStart;
              const inRange = verseStart !== null && v >= Math.min(verseStart, v) && v <= Math.max(verseStart, v);

              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleSelectVerse(v)}
                  className={cn(
                    "h-10 text-sm rounded-md transition-colors font-medium",
                    isStart
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] text-sm"
              onClick={() => {
                onSelect(`${book} ${chapter}`);
                reset();
              }}
            >
              Capítulo inteiro
            </Button>
            {verseStart !== null && (
              <Button
                className="flex-1 min-h-[44px] text-sm"
                onClick={confirmSelection}
              >
                Confirmar v.{verseStart}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
