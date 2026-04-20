"use client";

import { useMemo, useState } from "react";
import { BIBLE, extractBookName } from "@features/gravacoes/lib/bible";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { BookOpen, X } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { useIsMobile } from "@/shared/hooks/use-mobile";

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

function Legend() {
  return (
    <div className="flex items-center gap-3 flex-wrap pt-1 border-t">
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
  );
}

export function BibleBookFilter({ gravacoes, selected, onSelect }: BibleBookFilterProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const trigger = (
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
  );

  const handleBookClick = (bookName: string, count: number, isSelected: boolean) => {
    if (count === 0) return;
    onSelect(isSelected ? null : bookName);
    setOpen(false);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90dvh] pb-safe">
          <DrawerHeader className="border-b">
            <DrawerTitle>Livros da Bíblia</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {totalBooks} livro(s) pregado(s)
              </p>
              {selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  Limpar filtro
                </Button>
              )}
            </div>

            {BIBLE.map((testament) => (
              <div key={testament.key} className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {testament.name}
                </p>
                {testament.sections.map((section) => (
                  <div key={section.name} className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground/60 font-medium">
                      {section.name}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {section.books.map((book) => {
                        const count = bookCounts[book.name] || 0;
                        const isSelected = selected === book.name;
                        return (
                          <button
                            key={book.name}
                            type="button"
                            className={cn(
                              "flex flex-col items-center justify-center min-h-11 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                                : count > 0
                                  ? cn(getHeatColor(count, maxCount), "active:scale-95 cursor-pointer")
                                  : "bg-muted/40 text-muted-foreground/25 cursor-default",
                            )}
                            onClick={() => handleBookClick(book.name, count, isSelected)}
                            disabled={count === 0}
                          >
                            <span className="font-semibold">{book.abbr}</span>
                            {count > 0 && (
                              <span className="text-[9px] opacity-70 leading-none mt-0.5">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <Legend />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
                                  onClick={() => handleBookClick(book.name, count, isSelected)}
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

            <Legend />
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
