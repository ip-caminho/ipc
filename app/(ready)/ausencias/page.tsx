"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@shared/components/auth/SemPermissaoFallback";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Plus, CalendarOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AvisoAusenciaDialog } from "@features/ausencias/components/AvisoAusenciaDialog";
import { getConvexErrorMessage } from "@/shared/lib/utils/convexError";

function formatBR(data: string): string {
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

function periodoLabel(a: { dataInicio: string; dataFim?: string }): string {
  if (a.dataFim && a.dataFim !== a.dataInicio) {
    return `${formatBR(a.dataInicio)} a ${formatBR(a.dataFim)}`;
  }
  return formatBR(a.dataInicio);
}

function AusenciasContent() {
  const { can } = useAuth();
  const podeRegistrar = can("ausencias:manage");
  const [createOpen, setCreateOpen] = useState(false);
  const [removerId, setRemoverId] = useState<Id<"avisosAusencia"> | null>(null);

  // @ts-ignore Convex TS2589
  const ausencias = useQuery(api.ausencias.queries.listProximas, {}) as
    | any[]
    | undefined;
  // @ts-ignore Convex TS2589
  const removerAusencia = useMutation(api.ausencias.mutations.removerAusencia);

  async function handleRemover() {
    if (!removerId) return;
    try {
      await removerAusencia({ id: removerId });
      toast.success("Ausência removida");
    } catch (error) {
      toast.error(getConvexErrorMessage(error, "Erro ao remover"));
    } finally {
      setRemoverId(null);
    }
  }

  return (
    <HeaderLayout>
      <div className="space-y-4">
        <PageHeader
          title="Ausências"
          subtitle="Avise quando não estará disponível. Fica visível para a liderança no calendário e você não será escalado no período."
        />

        {podeRegistrar && (
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Registrar ausência
          </Button>
        )}

        {ausencias === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : ausencias.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <CalendarOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma ausência registrada para o período.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ausencias.map((a) => (
              <Card key={a._id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.nomeCompleto || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {periodoLabel(a)}
                    {a.motivo ? ` · ${a.motivo}` : ""}
                  </p>
                </div>
                {a.podeRemover && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoverId(a._id)}
                    aria-label="Remover ausência"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        <AvisoAusenciaDialog open={createOpen} onOpenChange={setCreateOpen} />

        <AlertDialog open={!!removerId} onOpenChange={(o) => !o && setRemoverId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover ausência?</AlertDialogTitle>
              <AlertDialogDescription>
                Você voltará a ficar disponível para escala nesse período.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemover}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </HeaderLayout>
  );
}

export default function AusenciasPage() {
  return (
    <PermissionGate permission="ausencias:read" fallback={<SemPermissaoFallback />}>
      <AusenciasContent />
    </PermissionGate>
  );
}
