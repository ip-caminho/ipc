"use client";

import { useMemo } from "react";
import { BIBLE, extractBookName } from "@features/gravacoes/lib/bible";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { BookOpen, X } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

interface BibleBookFilterProps {
  gravacoes: any[];
  selected: string | null;
  onSelect: (bookName: string | null) => void;
}

function getHeatColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/50 text-muted-foreground/30";
  const ratio = count / max;
  if (ratio >= 0.7) return "bg-primary/50 text-primary";
  if (ratio >= 0.3) return "bg-primary/30 text-primary/90";
  return "bg-primary/15 text-primary/70";
}

export function BibleBookFilter({ gravacoes, selected, onSelect }: BibleBookFilterProps) {
  const { bookCounts, maxCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of gravacoes) {
      const book = extractBookName(g.textoBase);
      if (book) {
        counts[book] = (counts[book] || 0) + 1;
      }
    }
    const max = Math.max(1, ...Object.values(counts));
    return { bookCounts: counts, maxCount: max };
  }, [gravacoes]);

  const totalBooks = Object.keys(bookCounts).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selected ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {selected || "Livros da Biblia"}
          {selected && (
            <span
              role="button"
              className="ml-1 rounded-full hover:bg-primary-foreground/20 p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[90vw] p-0" align="start" sideOffset={8}>
        <TooltipProvider delayDuration={200}>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {totalBooks} livro(s) pregado(s)
              </p>
              {selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onSelect(null)}
                >
                  Limpar filtro
                </Button>
              )}
            </div>

            <div className="flex gap-6">
              {BIBLE.map((testament) => (
                <div key={testament.key} className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {testament.name}
                  </p>
                  {testament.sections.map((section) => (
                    <div key={section.name} className="space-y-1">
                      <p className="text-[10px] text-muted-foreground/50 font-medium">
                        {section.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {section.books.map((book) => {
                          const count = bookCounts[book.name] || 0;
                          const isSelected = selected === book.name;

                          return (
                            <Tooltip key={book.name}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "h-8 min-w-[32px] px-1.5 rounded-sm text-[10px] font-medium",
                                    "transition-all duration-150 hover:scale-110 hover:z-10",
                                    "flex items-center justify-center",
                                    isSelected
                                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                                      : count > 0
                                        ? cn(getHeatColor(count, maxCount), "hover:ring-1 hover:ring-primary/50 cursor-pointer")
                                        : "bg-muted/40 text-muted-foreground/25 cursor-default",
                                  )}
                                  onClick={() => {
                                    if (count === 0) return;
                                    onSelect(isSelected ? null : book.name);
                                  }}
                                >
                                  {book.abbr}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <span className="font-medium">{book.name}</span>
                                {count > 0 && (
                                  <span className="text-muted-foreground ml-1.5">
                                    {count} {count === 1 ? "gravacao" : "gravacoes"}
                                  </span>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 pt-1 border-t">
              <span className="text-[10px] text-muted-foreground/50">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-muted/40" />
                <span className="text-[10px] text-muted-foreground/50">Nenhum</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-primary/15" />
                <span className="text-[10px] text-muted-foreground/50">Poucos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-primary/30" />
                <span className="text-[10px] text-muted-foreground/50">Alguns</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-primary/50" />
                <span className="text-[10px] text-muted-foreground/50">Muitos</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
