"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

interface OvelhinhasManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OvelhinhasManager({ open, onOpenChange }: OvelhinhasManagerProps) {
  const [search, setSearch] = useState("");
  const membros = useQuery(
    api.educacional.queries.listMembrosParaOvelhinha,
    open ? {} : "skip"
  );
  const addApta = useMutation(api.educacional.mutations.addOvelhinhaApta);
  const removeApta = useMutation(api.educacional.mutations.removeOvelhinhaApta);

  const toggle = async (membroId: string, apto: boolean) => {
    try {
      if (apto) {
        await addApta({ membroId: membroId as Id<"membros"> });
      } else {
        await removeApta({ membroId: membroId as Id<"membros"> });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const termo = search.trim().toLowerCase();
  const filtrados = (membros || []).filter((m) =>
    termo ? m.nome.toLowerCase().includes(termo) : true
  );
  const totalAptos = (membros || []).filter((m) => m.apto).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ovelhinhas</DialogTitle>
          <DialogDescription>
            Marque os membros aptos a serem ovelhinha. {totalAptos} marcado
            {totalAptos !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar membro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-96 overflow-y-auto space-y-1">
          {membros === undefined ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
          ) : (
            filtrados.map((m) => (
              <label
                key={m.membroId}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={m.apto}
                  onCheckedChange={(v) => toggle(m.membroId, v === true)}
                />
                <Avatar className="h-8 w-8 shrink-0">
                  {m.foto && <AvatarImage src={m.foto} alt={m.nome} />}
                  <AvatarFallback className="text-xs">{m.nome.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{m.nome}</span>
              </label>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
