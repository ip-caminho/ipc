"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LouvorPicker } from "@/shared/louvor/components/LouvorPicker";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { GripVertical, Trash2, Music, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";

const SEPARATOR_PREFIX = "---";

const FIXED_SECTIONS = [
  "Abertura",
  "Confissão",
  "Ceia",
  "Oferta",
] as const;

function isSeparator(item: string) {
  return item.startsWith(SEPARATOR_PREFIX);
}

function separatorLabel(item: string) {
  return item.slice(SEPARATOR_PREFIX.length);
}

interface LouvorOrdemSectionProps {
  cultoId: Id<"cultos">;
  louvores: string[];
  temCeia: boolean;
  canEdit: boolean;
  dataLabel: string;
}

export function LouvorOrdemSection({ cultoId, louvores, temCeia, canEdit, dataLabel }: LouvorOrdemSectionProps) {
  const updateLouvores = useMutation(api.escalas.mutations.updateLouvores);
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Garantir que as seções fixas existem no array, na ordem correta
  const ensureSections = (items: string[]): string[] => {
    const activeSections = temCeia ? FIXED_SECTIONS : FIXED_SECTIONS.filter((s) => s !== "Ceia");

    // Extrair músicas de cada seção existente
    const sectionMusicas: Record<string, string[]> = {};
    let currentLabel: string | null = null;
    const orphans: string[] = [];

    for (const item of items) {
      if (isSeparator(item)) {
        currentLabel = separatorLabel(item);
        if (!sectionMusicas[currentLabel]) sectionMusicas[currentLabel] = [];
      } else if (currentLabel) {
        sectionMusicas[currentLabel].push(item);
      } else {
        orphans.push(item);
      }
    }

    // Reconstruir na ordem correta
    const result: string[] = [];
    for (const section of activeSections) {
      result.push(`${SEPARATOR_PREFIX}${section}`);
      // Primeira seção recebe as orfãs
      if (result.length === 1 && orphans.length > 0) {
        result.push(...orphans);
      }
      if (sectionMusicas[section]) {
        result.push(...sectionMusicas[section]);
      }
    }

    return result;
  };

  // Ao abrir, sincronizar estado local
  const handleOpen = () => {
    setLocalItems(ensureSections(louvores));
    setOpen(true);
  };

  const save = async (next: string[]) => {
    setLocalItems(next); // atualizar local imediatamente
    try {
      await updateLouvores({ cultoId, louvores: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  // Agrupa itens por seção
  const sections = groupBySection(localItems);

  const handleAddToSection = (sectionIdx: number, _id: string, titulo: string) => {
    const items = localItems;
    // Encontrar a posição do próximo separador após este
    let insertAt = items.length;
    let currentSection = -1;
    for (let i = 0; i < items.length; i++) {
      if (isSeparator(items[i])) {
        currentSection++;
        if (currentSection === sectionIdx + 1) {
          insertAt = i;
          break;
        }
      }
    }
    const next = [...items];
    next.splice(insertAt, 0, titulo);
    save(next);
  };

  const handleRemove = (flatIndex: number) => {
    const items = localItems;
    // Não permitir remover separadores fixos
    if (isSeparator(items[flatIndex])) return;
    save(items.filter((_, i) => i !== flatIndex));
  };

  const handleDragStart = (e: React.DragEvent, flatIndex: number) => {
    // Não arrastar separadores
    const items = localItems;
    if (isSeparator(items[flatIndex])) return;
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
    const items = localItems;
    const next = [...items];
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

  const musicCount = louvores.filter((l) => !isSeparator(l)).length;

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
            {/* Adicionar musica — no topo */}
            {canEdit && (
              <div className="space-y-1.5 pb-4 border-b">
                <p className="text-xs font-medium text-muted-foreground">Adicionar musica</p>
                <LouvorPicker
                  onSelect={(_id, titulo) => {
                    const insertAt = findNextInsertPosition(localItems, temCeia);
                    const next = [...localItems];
                    next.splice(insertAt, 0, titulo);
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
                {/* Separador fixo */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {section.label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Músicas desta seção */}
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
                        "flex items-center gap-3 rounded-lg border px-4 py-3 bg-card transition-all",
                        canEdit && "cursor-grab active:cursor-grabbing",
                        dragIdx === musica.flatIndex && "opacity-40",
                        overIdx === musica.flatIndex && dragIdx !== musica.flatIndex && "ring-2 ring-primary bg-primary/5",
                      )}
                    >
                      {canEdit && (
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className="text-sm flex-1 truncate">{musica.titulo}</span>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(musica.flatIndex)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
  musicas: { titulo: string; flatIndex: number }[];
};

function groupBySection(items: string[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  let current: SectionGroup | null = null;

  for (let i = 0; i < items.length; i++) {
    if (isSeparator(items[i])) {
      current = { label: separatorLabel(items[i]), sepFlatIndex: i, musicas: [] };
      sections.push(current);
    } else if (current) {
      current.musicas.push({ titulo: items[i], flatIndex: i });
    } else {
      // Músicas antes de qualquer seção — criar seção implícita
      current = { label: "Inicio", sepFlatIndex: -1, musicas: [{ titulo: items[i], flatIndex: i }] };
      sections.push(current);
    }
  }

  return sections;
}

/** Capacidade padrão de cada seção */
const SECTION_CAPACITY: Record<string, number> = {
  "Abertura": 1,
  "Confissão": 3,
  "Ceia": 1,
  "Oferta": 1,
};

/**
 * Encontra a posição para inserir a próxima música,
 * preenchendo seções na ordem até atingir a capacidade padrão.
 * Se todas estão cheias, insere no final da última seção.
 */
function findNextInsertPosition(items: string[], temCeia: boolean): number {
  const sections = groupBySection(items);
  const activeSections = temCeia ? FIXED_SECTIONS : FIXED_SECTIONS.filter((s) => s !== "Ceia");

  for (const sectionName of activeSections) {
    const section = sections.find((s) => s.label === sectionName);
    if (!section) continue;
    const capacity = SECTION_CAPACITY[sectionName] ?? 1;
    if (section.musicas.length < capacity) {
      // Inserir após a última música desta seção, ou após o separador se vazia
      if (section.musicas.length > 0) {
        return section.musicas[section.musicas.length - 1].flatIndex + 1;
      }
      return section.sepFlatIndex + 1;
    }
  }

  // Todas cheias — inserir no final
  return items.length;
}
