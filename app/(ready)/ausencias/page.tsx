"use client";

import { useState, useMemo } from "react";
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
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils/cn";
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
import {
  type AusenciaItem,
  type Bucket,
  BUCKET_LABEL,
  BUCKET_ORDER,
  hojeISO,
  bucketOf,
  dataRangeLabel,
  iniciais,
} from "@features/ausencias/lib/display";

function AusenciaRow({
  a,
  destaque,
  onRemover,
}: {
  a: AusenciaItem;
  destaque: boolean;
  onRemover: (id: AusenciaItem["_id"]) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback
          className={cn(
            "text-sm font-medium",
            destaque
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-primary/10 text-primary",
          )}
        >
          {iniciais(a.nomeCompleto)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium">{a.nomeCompleto || "—"}</p>
          {a.podeRemover && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              você
            </span>
          )}
        </div>
        {a.motivo && (
          <p className="truncate text-sm text-muted-foreground">{a.motivo}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {dataRangeLabel(a)}
        </span>
        {a.podeRemover && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onRemover(a._id)}
            aria-label="Remover ausência"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AusenciasContent() {
  const { can } = useAuth();
  const podeRegistrar = can("ausencias:manage");
  const [createOpen, setCreateOpen] = useState(false);
  const [removerId, setRemoverId] = useState<Id<"avisosAusencia"> | null>(null);

  // @ts-ignore Convex TS2589
  const ausencias = useQuery(api.ausencias.queries.listProximas, {}) as
    | AusenciaItem[]
    | undefined;
  // @ts-ignore Convex TS2589
  const removerAusencia = useMutation(api.ausencias.mutations.removerAusencia);

  const grupos = useMemo(() => {
    const hoje = hojeISO();
    const g: Record<Bucket, AusenciaItem[]> = { agora: [], semana: [], adiante: [] };
    for (const a of ausencias ?? []) g[bucketOf(a, hoje)].push(a);
    return g;
  }, [ausencias]);

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
          <div className="space-y-5">
            {BUCKET_ORDER.filter((b) => grupos[b].length > 0).map((b) => (
              <section key={b} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {BUCKET_LABEL[b]}
                </h2>
                <Card className="divide-y p-0">
                  {grupos[b].map((a) => (
                    <AusenciaRow
                      key={a._id}
                      a={a}
                      destaque={b === "agora"}
                      onRemover={setRemoverId}
                    />
                  ))}
                </Card>
              </section>
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
