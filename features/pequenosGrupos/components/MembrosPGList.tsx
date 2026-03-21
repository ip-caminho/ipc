"use client";

import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface MembrosPGListProps {
  membros: Array<{
    _id: Id<"pgMembros">;
    membroId: Id<"membros">;
    nome: string;
  }>;
  canRemove: boolean;
  onRemove: (id: Id<"pgMembros">) => void;
}

export function MembrosPGList({ membros, canRemove, onRemove }: MembrosPGListProps) {
  if (membros.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum membro neste PG
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {membros.map((m) => (
        <li key={m._id} className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {m.nome?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm flex-1">{m.nome || "—"}</span>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onRemove(m._id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
