"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LouvorPicker } from "@/shared/louvor/components/LouvorPicker";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { GripVertical, Trash2, Music } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";
import { TomSelector } from "./TomSelector";

const SEPARATOR_PREFIX = "---";

const FIXED_SECTIONS = [
  "Abertura",
  "Confissão",
  "Ceia",
  "Oferta",
] as const;

/** Item interno para manipulação */
interface OrderItem {
  type: "separator" | "song";
  louvorId?: Id<"louvores">;
  titulo: string;
  tom?: string;
  secao?: string;
}

interface LouvorOrdemSectionProps {
  cultoId: Id<"cultos">;
  louvores: string[]; // legado — usado como fallback
  temCeia: boolean;
  canEdit: boolean;
  dataLabel: string;
}

export function LouvorOrdemSection({ cultoId, louvores, temCeia, canEdit, dataLabel }: LouvorOrdemSectionProps) {
  const setCultoLouvores = useMutation(api.escalas.cultoLouvores.setCultoLouvores);
  const updateLouvoresLegacy = useMutation(api.escalas.mutations.updateLouvores);
  // @ts-ignore Convex TS2589
  const enrichedData = useQuery(api.escalas.cultoLouvores.getCultoLouvoresEnriched, { cultoId });

  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState<OrderItem[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  /** Converter string[] legado para OrderItem[] */
  function legacyToItems(legacy: string[]): OrderItem[] {
    return legacy.map((s) => {
      if (s.startsWith(SEPARATOR_PREFIX)) {
        return { type: "separator" as const, titulo: "", secao: s.slice(SEPARATOR_PREFIX.length) };
      }
      return { type: "song" as const, titulo: s };
    });
  }

  /** Converter enrichedData para OrderItem[] */
  function enrichedToItems(data: NonNullable<typeof enrichedData>): OrderItem[] {
    return data.map((d) => {
      if (d.secao && !d.louvorId) {
        return { type: "separator" as const, titulo: "", secao: d.secao };
      }
      return {
        type: "song" as const,
        louvorId: d.louvorId || undefined,
        titulo: d.titulo,
        tom: d.tomEscolhido || d.tomOriginal || undefined,
      };
    });
  }

  /** Garantir que as seções fixas existem */
  function ensureSections(items: OrderItem[]): OrderItem[] {
    const activeSections = temCeia ? FIXED_SECTIONS : FIXED_SECTIONS.filter((s) => s !== "Ceia");

    const sectionMusicas: Record<string, OrderItem[]> = {};
    let currentLabel: string | null = null;
    const orphans: OrderItem[] = [];

    for (const item of items) {
      if (item.type === "separator") {
        currentLabel = item.secao || "";
        if (!sectionMusicas[currentLabel]) sectionMusicas[currentLabel] = [];
      } else if (currentLabel) {
        sectionMusicas[currentLabel].push(item);
      } else {
        orphans.push(item);
      }
    }

    const result: OrderItem[] = [];
    for (let i = 0; i < activeSections.length; i++) {
      const section = activeSections[i];
      result.push({ type: "separator", titulo: "", secao: section });
      if (i === 0 && orphans.length > 0) {
        result.push(...orphans);
      }
      if (sectionMusicas[section]) {
        result.push(...sectionMusicas[section]);
      }
    }

    return result;
  }

  const handleOpen = () => {
    // Preferir dados enriquecidos, fallback para legado
    const source = enrichedData && enrichedData.length > 0
      ? enrichedToItems(enrichedData)
      : legacyToItems(louvores);
    setLocalItems(ensureSections(source));
    setOpen(true);
  };

  /** Salvar: dual-write via nova mutation */
  const save = async (next: OrderItem[]) => {
    setLocalItems(next);
    try {
      const items = next.map((item) => {
        if (item.type === "separator") {
          return { secao: item.secao };
        }
        return {
          louvorId: item.louvorId,
          tituloLegado: item.titulo,
          tom: item.tom,
        };
      });
      await setCultoLouvores({ cultoId, items });
    } catch (e) {
      // Fallback: tentar salvar no formato legado
      try {
        const legacy = next.map((item) =>
          item.type === "separator" ? `${SEPARATOR_PREFIX}${item.secao}` : item.titulo
        );
        await updateLouvoresLegacy({ cultoId, louvores: legacy });
      } catch {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar");
      }
    }
  };

  const sections = groupBySection(localItems);

  const handleRemove = (flatIndex: number) => {
    if (localItems[flatIndex].type === "separator") return;
    save(localItems.filter((_, i) => i !== flatIndex));
  };

  const handleUpdateTom = (flatIndex: number, tom: string) => {
    const next = [...localItems];
    next[flatIndex] = { ...next[flatIndex], tom };
    save(next);
  };

  const handleDragStart = (e: React.DragEvent, flatIndex: number) => {
    if (localItems[flatIndex].type === "separator") return;
    setDragIdx(flatIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, flatIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(flatIndex);
  };

  const handleDrop = (e: React.DragEvent, flatIndex: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === flatIndex) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...localItems];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(flatIndex, 0, moved);
    save(next);
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const musicCount = louvores.filter((l) => !l.startsWith(SEPARATOR_PREFIX)).length;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[11px] gap-1 text-muted-foreground px-1.5"
        onClick={handleOpen}
      >
        <Music className="h-3 w-3" />
        {musicCount > 0 ? `${musicCount} música${musicCount > 1 ? "s" : ""}` : "Músicas"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Músicas — {dataLabel}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 px-3 space-y-2">
            {/* Adicionar musica */}
            {canEdit && (
              <div className="space-y-1.5 pb-4 border-b">
                <p className="text-xs font-medium text-muted-foreground">Adicionar musica</p>
                <LouvorPicker
                  onSelect={(id, titulo, tom) => {
                    const insertAt = findNextInsertPosition(localItems, temCeia);
                    const next = [...localItems];
                    next.splice(insertAt, 0, {
                      type: "song",
                      louvorId: id as Id<"louvores">,
                      titulo,
                      tom,
                    });
                    save(next);
                  }}
                  placeholder="Selecionar do repertorio..."
                />
              </div>
            )}

            {!temCeia && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Sem Santa Ceia neste domingo
              </div>
            )}

            {/* Seções */}
            {sections.filter((s) => temCeia || s.label !== "Ceia").map((section) => (
              <div key={section.label} className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {section.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {section.musicas.length === 0 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setOverIdx(section.sepFlatIndex + 1); }}
                    onDrop={(e) => handleDrop(e, section.sepFlatIndex + 1)}
                    className={cn(
                      "py-4 text-center text-xs text-muted-foreground/50 rounded-lg border border-dashed",
                      overIdx === section.sepFlatIndex + 1 && dragIdx !== null && "border-primary bg-primary/5",
                    )}
                  >
                    Arraste uma musica aqui
                  </div>
                )}
                <div className="space-y-2">
                  {section.musicas.map((musica) => (
                    <div
                      key={musica.flatIndex}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, musica.flatIndex)}
                      onDragOver={(e) => handleDragOver(e, musica.flatIndex)}
                      onDragLeave={() => setOverIdx(null)}
                      onDrop={(e) => handleDrop(e, musica.flatIndex)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-card transition-all",
                        canEdit && "cursor-grab active:cursor-grabbing",
                        dragIdx === musica.flatIndex && "opacity-40",
                        overIdx === musica.flatIndex && dragIdx !== musica.flatIndex && "ring-2 ring-primary bg-primary/5",
                      )}
                    >
                      {canEdit && (
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className="text-sm flex-1 truncate">{musica.titulo}</span>
                      {/* Tom */}
                      {canEdit ? (
                        <TomSelector
                          value={musica.tom}
                          onChange={(tom) => handleUpdateTom(musica.flatIndex, tom)}
                        />
                      ) : musica.tom ? (
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{musica.tom}</span>
                      ) : null}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-tap"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(musica.flatIndex)}
                          aria-label="Remover música"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

type SectionGroup = {
  label: string;
  sepFlatIndex: number;
  musicas: { titulo: string; tom?: string; flatIndex: number }[];
};

function groupBySection(items: OrderItem[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  let current: SectionGroup | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === "separator") {
      current = { label: item.secao || "", sepFlatIndex: i, musicas: [] };
      sections.push(current);
    } else if (current) {
      current.musicas.push({ titulo: item.titulo, tom: item.tom, flatIndex: i });
    } else {
      current = { label: "Inicio", sepFlatIndex: -1, musicas: [{ titulo: item.titulo, tom: item.tom, flatIndex: i }] };
      sections.push(current);
    }
  }

  return sections;
}

const SECTION_CAPACITY: Record<string, number> = {
  "Abertura": 1,
  "Confissão": 3,
  "Ceia": 1,
  "Oferta": 1,
};

function findNextInsertPosition(items: OrderItem[], temCeia: boolean): number {
  const sections = groupBySection(items);
  const activeSections = temCeia ? FIXED_SECTIONS : FIXED_SECTIONS.filter((s) => s !== "Ceia");

  for (const sectionName of activeSections) {
    const section = sections.find((s) => s.label === sectionName);
    if (!section) continue;
    const capacity = SECTION_CAPACITY[sectionName] ?? 1;
    if (section.musicas.length < capacity) {
      if (section.musicas.length > 0) {
        return section.musicas[section.musicas.length - 1].flatIndex + 1;
      }
      return section.sepFlatIndex + 1;
    }
  }

  return items.length;
}
