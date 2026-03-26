"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@shared/hooks/useDebounce";
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

interface LouvorPickerProps {
  value?: string;
  onSelect: (id: string, titulo: string) => void;
  placeholder?: string;
}

export function LouvorPicker({ value, onSelect, placeholder = "Selecionar musica..." }: LouvorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);

  // @ts-ignore Convex TS2589
  const results = useQuery(
    api.louvor.queries.search,
    debouncedSearch.length >= 2 ? { query: debouncedSearch } : "skip"
  );

  // @ts-ignore Convex TS2589
  const selected = useQuery(
    api.louvor.queries.getById,
    value ? { id: value as any } : "skip"
  );

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
            placeholder="Buscar por titulo..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.length < 2 ? "Digite pelo menos 2 caracteres" : "Nenhuma musica encontrada"}
            </CommandEmpty>
            {results && results.length > 0 && (
              <CommandGroup>
                {results.map((r) => (
                  <CommandItem
                    key={r._id}
                    value={r._id}
                    onSelect={() => {
                      onSelect(r._id, r.titulo);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === r._id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{r.titulo}</span>
                      {r.artista && (
                        <span className="text-xs text-muted-foreground ml-2">{r.artista}</span>
                      )}
                    </div>
                    {r.tom && (
                      <span className="text-xs font-mono text-muted-foreground">{r.tom}</span>
                    )}
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
