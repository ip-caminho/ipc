"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";

function formatarData(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function HistoricoEclesiasticoDrawer({
  membroId,
  nome,
  open,
  onOpenChange,
}: {
  membroId: Id<"membros">;
  nome: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // @ts-expect-error Convex TS2589
  const historico = useQuery(api.membros.eclesiastico.getHistorico, open ? { membroId } : "skip");
  const update = useMutation(api.membros.eclesiastico.updateEclesiastico);
  const [revertendo, setRevertendo] = useState<string | null>(null);

  async function reverter(item: {
    id: string;
    field: string;
    label: string;
    de: string | null;
  }) {
    setRevertendo(item.id);
    try {
      await update({ membroId, data: { [item.field]: item.de ?? "" } });
      toast.success(`"${item.label}" revertido`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reverter");
    } finally {
      setRevertendo(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Historico — {nome}</SheetTitle>
          <SheetDescription>
            Alteracoes eclesiasticas. Use &quot;Reverter&quot; para desfazer um ajuste.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {historico === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteracao registrada.</p>
          ) : (
            <ul className="space-y-3">
              {historico.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through">{item.de ?? "—"}</span>
                      {" → "}
                      <span>{item.para ?? "—"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatarData(item.em)}
                      {item.autor ? ` · ${item.autor}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revertendo === item.id}
                    onClick={() => reverter(item)}
                    title={`Reverter para "${item.de ?? "vazio"}"`}
                  >
                    <Undo2 className="h-3.5 w-3.5 mr-1" />
                    Reverter
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
