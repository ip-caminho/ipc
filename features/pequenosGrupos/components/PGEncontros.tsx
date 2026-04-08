"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Trash2, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PGEncontroForm } from "./PGEncontroForm";

interface PGEncontrosProps {
  pgId: Id<"pequenosGrupos">;
  membros: Array<{ _id: string; membroId: string; nome: string }>;
  canEdit: boolean;
}

export function PGEncontros({ pgId, membros, canEdit }: PGEncontrosProps) {
  // @ts-ignore Convex TS2589
  const encontros = useQuery(api.pequenosGrupos.queries.listEncontros, { pgId });
  const removeEncontro = useMutation(api.pequenosGrupos.mutations.removeEncontro);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"pgEncontros"> | null>(null);

  const handleRemove = async (encontroId: Id<"pgEncontros">) => {
    if (!confirm("Excluir este encontro e todas as presencas?")) return;
    try {
      await removeEncontro({ encontroId });
      toast.success("Encontro excluido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  if (encontros === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditingId(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Novo encontro
          </Button>
        </div>
      )}

      {encontros.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum encontro registrado</p>
      ) : (
        <div className="space-y-2">
          {encontros.map((e: any) => {
            const date = parseISO(e.data);
            return (
              <Card key={e._id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(date, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(date, "EEEE", { locale: ptBR })}
                      </span>
                    </div>
                    {e.tema && <p className="text-sm text-muted-foreground mt-0.5">{e.tema}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {e.totalPresentes}
                    </Badge>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingId(e._id); setFormOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(e._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PGEncontroForm
        open={formOpen}
        onOpenChange={setFormOpen}
        pgId={pgId}
        membros={membros}
        editingEncontroId={editingId}
      />
    </div>
  );
}
