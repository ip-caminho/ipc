"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { QuartosBoard } from "@features/retiro/components/QuartosBoard";
import { LABEL_QUARTO, TIPOS_QUARTO } from "@features/retiro/lib/format";

function Conteudo({ retiroId }: { retiroId: Id<"retiros"> }) {
  // @ts-ignore Convex TS2589
  const acamp = useQuery(api.retiro.queries.getById, { id: retiroId });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/retiro/${retiroId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Inscrições
          </Link>
        </Button>
        {acamp && (
          <p className="text-sm text-muted-foreground">
            Estoque:{" "}
            {TIPOS_QUARTO.filter((t) => acamp.estoque[t] > 0)
              .map((t) => `${acamp.estoque[t]} ${LABEL_QUARTO[t].toLowerCase()}`)
              .join(" · ") || "—"}
          </p>
        )}
      </div>
      <QuartosBoard retiroId={retiroId} />
    </div>
  );
}

export default function QuartosPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGate
      permission="retiro:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <HeaderLayout>
        <PageHeader title="Quartos do retiro" />
        <div className="mt-4">
          <Conteudo retiroId={params.id as Id<"retiros">} />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
