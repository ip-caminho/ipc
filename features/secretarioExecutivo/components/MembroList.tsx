"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search } from "lucide-react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { CARGO_ECLESIASTICO_OPTIONS } from "@features/membros/lib/constants";
import { cn } from "@shared/lib/utils/cn";

type MembroRow = {
  _id: string;
  entidade: {
    _id: string;
    nomeCompleto?: string;
    whatsapp?: string;
    status: string;
    foto?: string;
  };
  cargoEclesiastico?: string;
  rol?: string;
};

interface MembroListProps {
  selectedId?: string;
}

export function MembroList({ selectedId }: MembroListProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const membros = useQuery(api.membros.queries.list, {
    search: debouncedSearch || undefined,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b bg-background sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {membros === undefined ? (
          <div className="p-3 space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : membros.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center px-3">
            Nenhum membro encontrado.
          </p>
        ) : (
          <ul className="py-1">
            {(membros as MembroRow[]).map((m) => (
              <MembroItem
                key={m._id}
                membro={m}
                selected={selectedId === m._id}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MembroItem({
  membro,
  selected,
}: {
  membro: MembroRow;
  selected: boolean;
}) {
  const cargoOpt = CARGO_ECLESIASTICO_OPTIONS.find(
    (o) => o.value === membro.cargoEclesiastico,
  );
  const nome = membro.entidade?.nomeCompleto || "-";

  return (
    <li>
      <Link
        href={`/secretario-executivo/${membro._id}`}
        scroll={false}
        className={cn(
          "block px-3 py-2.5 border-l-2 transition-colors",
          selected
            ? "bg-accent border-l-primary"
            : "border-l-transparent hover:bg-accent/50",
        )}
        aria-current={selected ? "page" : undefined}
      >
        <p className={cn("text-sm truncate", selected && "font-medium")}>
          {nome}
        </p>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {cargoOpt && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
              {cargoOpt.label}
            </Badge>
          )}
          {membro.rol && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
              Rol {membro.rol}
            </Badge>
          )}
        </div>
      </Link>
    </li>
  );
}
