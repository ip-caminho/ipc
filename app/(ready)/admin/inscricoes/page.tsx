"use client";

import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { InscricoesPanel } from "@features/site-publico/components/paineis/InscricoesPanel";

// Gestão de inscrições (secretaria). Gated por inscricoes:manage — permissão
// própria, separada do site_publico:manage que edita o conteúdo do site.
export default function InscricoesPage() {
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
        <PageHeader title="Inscrições" />
        <div className="mt-4">
          <InscricoesPanel />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
