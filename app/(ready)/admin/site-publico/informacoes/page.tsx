"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { InformacoesSiteForm } from "@features/site-publico/components/InformacoesSiteForm";

function Informacoes() {
  // @ts-ignore Convex TS2589
  const igreja = useQuery(api.preferencias.queries.getIgrejaInfo);
  return (
    <HeaderLayout>
      <PageHeader title="Informações da igreja" />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Estes dados alimentam o rodapé do site, a página Visite e o cabeçalho de busca
        (SEO). Ao salvar, o site reflete a mudança automaticamente.
      </p>
      {igreja === undefined ? (
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : (
        <InformacoesSiteForm initial={igreja} />
      )}
    </HeaderLayout>
  );
}

export default function InformacoesPage() {
  return (
    <PermissionGate
      permission="site_publico:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <Informacoes />
    </PermissionGate>
  );
}
