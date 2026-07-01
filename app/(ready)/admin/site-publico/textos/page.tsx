"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TextosSiteForm } from "@features/site-publico/components/TextosSiteForm";

function Textos() {
  // @ts-ignore Convex TS2589
  const textos = useQuery(api.preferencias.queries.getTextosSite);
  return (
    <HeaderLayout>
      <PageHeader title="Textos do site" />
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Título e subtítulo do topo da home. As páginas de conteúdo (Quem somos) são
        editadas diretamente no código.
      </p>
      {textos === undefined ? (
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : (
        <TextosSiteForm initial={textos} />
      )}
    </HeaderLayout>
  );
}

export default function TextosSitePage() {
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
      <Textos />
    </PermissionGate>
  );
}
