"use client";

import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { CargosHistoricoSection } from "@features/membros/components/CargosHistoricoSection";

export function CargosDrawer({
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cargos / Mandato — {nome}</SheetTitle>
          <SheetDescription>
            Registre o cargo (presbitero/diacono/pastor) com inicio e fim previsto, e
            encerre mandatos. Mandato IPB: ate 5 anos.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          <CargosHistoricoSection membroId={membroId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
