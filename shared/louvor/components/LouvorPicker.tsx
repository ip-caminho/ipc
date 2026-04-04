"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Music, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

/** Extrai a primeira linha de letra (ignorando acordes, secoes e vazias) */
function getFirstLyricLine(conteudo?: string): string {
  if (!conteudo) return "";
  const CHORD_RE = /^[A-G][#b]?(m|M|min|maj|dim|aug|sus[24]?|add|[0-9]+|\/[A-G][#b]?)*$/;
  for (const line of conteudo.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("{") || trimmed.startsWith("---")) continue;
    if (/^(verso|refrão|refrao|chorus|verse|bridge|intro|outro|pre-|pré-)/i.test(trimmed)) continue;
    // Remover acordes ChordPro inline: [Am7]texto → texto
    const withoutChordPro = trimmed.replace(/\[[^\]]*\]/g, "").trim();
    if (!withoutChordPro) continue;
    // Linha só de acordes (plain text)
    const cleaned = withoutChordPro.replace(/[()]/g, "");
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.every((t) => CHORD_RE.test(t))) continue;
    const result = withoutChordPro.replace(/ {2,}/g, " ");
    return result.length > 50 ? result.slice(0, 50) + "…" : result;
  }
  return "";
}

interface LouvorPickerProps {
  value?: string;
  onSelect: (id: string, titulo: string, tom?: string) => void;
  placeholder?: string;
}

export function LouvorPicker({ value, onSelect, placeholder = "Selecionar musica..." }: LouvorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // @ts-ignore Convex TS2589
  const allLouvores = useQuery(api.louvor.queries.list, { status: "ATIVO" });

  // @ts-ignore Convex TS2589
  const selected = useQuery(
    api.louvor.queries.getById,
    value ? { id: value as any } : "skip"
  );

  // Filtro local (sem debounce)
  const filtered = (allLouvores || []).filter((l: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      l.titulo.toLowerCase().includes(term) ||
      (l.artista || "").toLowerCase().includes(term) ||
      (l.conteudo || "").toLowerCase().includes(term)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="flex items-center gap-2 truncate">
            <Music className="h-4 w-4 shrink-0" />
            {selected ? selected.titulo : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhuma musica encontrada</CommandEmpty>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((r: any) => (
                  <CommandItem
                    key={r._id}
                    value={r._id}
                    onSelect={() => {
                      onSelect(r._id, r.titulo, r.tom);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === r._id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{r.titulo}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getFirstLyricLine(r.conteudo) || r.artista || ""}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
