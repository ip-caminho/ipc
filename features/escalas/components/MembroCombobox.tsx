"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/components/ui/command";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";

interface Membro {
  _id: string;
  entidade?: {
    nomeCompleto?: string;
    foto?: string;
  };
}

interface MembroComboboxProps {
  membros: Membro[];
  value?: string; // membroId
  displayName?: string; // what to show in the trigger
  onSelect: (membroId: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  children?: React.ReactNode; // extra CommandItems before the member list
}

export function MembroCombobox({
  membros,
  value,
  displayName,
  onSelect,
  placeholder = "—",
  triggerClassName,
  children,
}: MembroComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center h-8 text-xs px-1.5 rounded-md hover:bg-accent/50 text-left w-full truncate",
            !displayName && "text-muted-foreground",
            triggerClassName
          )}
        >
          {displayName || placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar membro..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum membro encontrado</CommandEmpty>
            {children && (
              <CommandGroup onClick={() => setOpen(false)}>
                {children}
              </CommandGroup>
            )}
            <CommandGroup>
              {membros.map((m) => {
                const nome = m.entidade?.nomeCompleto || "";
                return (
                  <CommandItem
                    key={m._id}
                    value={nome}
                    onSelect={() => {
                      onSelect(m._id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {nome.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{nome}</span>
                    {value === m._id && (
                      <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
