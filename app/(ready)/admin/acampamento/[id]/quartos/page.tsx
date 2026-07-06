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
import { QuartosBoard } from "@features/acampamento/components/QuartosBoard";

function Conteudo({ acampamentoId }: { acampamentoId: Id<"acampamentos"> }) {
  // @ts-ignore Convex TS2589
  const acamp = useQuery(api.acampamento.queries.getById, { id: acampamentoId });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/acampamento/${acampamentoId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Inscrições
          </Link>
        </Button>
        {acamp && (
          <p className="text-sm text-muted-foreground">
            Estoque: {acamp.estoqueDuplos} duplos · {acamp.estoqueTriplos} triplos
          </p>
        )}
      </div>
      <QuartosBoard acampamentoId={acampamentoId} />
    </div>
  );
}

export default function QuartosPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGate
      permission="inscricoes:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <HeaderLayout>
        <PageHeader title="Quartos do acampamento" />
        <div className="mt-4">
          <Conteudo acampamentoId={params.id as Id<"acampamentos">} />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
