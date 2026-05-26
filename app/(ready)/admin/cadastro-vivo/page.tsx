"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { VitalityStats } from "@features/cadastroVivo/components/VitalityStats";
import { MembrosTable } from "@features/cadastroVivo/components/MembrosTable";

export default function CadastroVivoPage() {
  const { isAdmin, can, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || can("membros:read");

  const data = useQuery(
    api.membros.cadastroVivo.getRegistryVitality,
    hasAccess ? {} : "skip"
  );

  if (authLoading) return <Skeleton className="h-64 w-full" />;

  if (!hasAccess) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Acesso restrito.</p>
          </CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Cadastro Vivo"
          subtitle="Saude e completude dos perfis de membros"
        />

        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <VitalityStats
              totalMembros={data.totalMembros}
              completosCount={data.completosCount}
              completosPercent={data.completosPercent}
              atualizadosCount={data.atualizadosCount}
              atualizadosPercent={data.atualizadosPercent}
              avgCompleteness={data.avgCompleteness}
            />

            <MembrosTable membros={data.membros} />
          </>
        )}
      </div>
    </HeaderLayout>
  );
}
