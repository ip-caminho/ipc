"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@shared/components/ui/progress";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { PrivateAvatarImage } from "@/shared/files/components/PrivateImage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";

type MembroRow = {
  membroId: Id<"membros">;
  nome: string;
  foto: string | null;
  percentage: number;
  missingCount: number;
  missing: Array<{ key: string; label: string }>;
  lastUpdated: number | null;
  isStale: boolean;
};

const PAGE_SIZE = 30;

type Filter = "todos" | "incompletos" | "desatualizados";

interface Props {
  membros: MembroRow[];
}

function formatLastUpdated(ts: number | null): string {
  if (!ts) return "Nunca";
  const meses = Math.floor((Date.now() - ts) / (30 * 24 * 60 * 60 * 1000));
  if (meses < 1) return "< 1 mes";
  if (meses === 1) return "1 mes";
  if (meses < 12) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? "1 ano" : `${anos} anos`;
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function MembrosTable({ membros }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("incompletos");
  const [visible, setVisible] = useState(PAGE_SIZE);

  let filtered = membros;

  if (filter === "incompletos") {
    filtered = filtered.filter((m) => m.percentage < 100);
  } else if (filter === "desatualizados") {
    filtered = filtered.filter((m) => m.isStale);
  }

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter((m) => m.nome.toLowerCase().includes(term));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Buscar membro..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
          className="flex-1 h-11 md:h-9"
        />
        <Select value={filter} onValueChange={(v) => { setFilter(v as Filter); setVisible(PAGE_SIZE); }}>
          <SelectTrigger className="w-[150px] h-11 md:w-[160px] md:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="incompletos">Incompletos</SelectItem>
            <SelectItem value="desatualizados">Desatualizados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} membros</p>

      <div className="space-y-2">
        {filtered.slice(0, visible).map((m) => (
          <Link
            key={m.membroId}
            href={`/membros/${m.membroId}`}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 active:opacity-80 transition-opacity"
          >
            <Avatar className="h-9 w-9">
              {m.foto && <PrivateAvatarImage src={m.foto} alt={m.nome} />}
              <AvatarFallback className="text-xs">{getInitials(m.nome)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{m.nome}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-sm md:text-xs",
                    m.percentage === 100
                      ? "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                      : m.percentage >= 50
                        ? "border-yellow-300 text-yellow-700 dark:text-yellow-400"
                        : "border-red-300 text-red-700 dark:text-red-400"
                  )}
                >
                  {m.percentage}%
                </Badge>
              </div>
              <Progress
                value={m.percentage}
                className={cn(
                  "h-1.5",
                  m.percentage === 100
                    ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
                    : m.percentage >= 50
                      ? "[&_[data-slot=progress-indicator]]:bg-yellow-500"
                      : "[&_[data-slot=progress-indicator]]:bg-red-500"
                )}
              />
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-xs text-muted-foreground truncate">
                  {m.missingCount > 0
                    ? `${m.missingCount} campo${m.missingCount > 1 ? "s" : ""} faltando`
                    : "Completo"}
                </p>
                <p className={cn("text-xs", m.isStale ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground")}>
                  {formatLastUpdated(m.lastUpdated)}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length > visible && (
          <Button
            variant="outline"
            className="h-11 w-full md:h-9"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            Mostrar mais ({filtered.length - visible})
          </Button>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum membro encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
