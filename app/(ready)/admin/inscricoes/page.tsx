"use client";

import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { InscricoesPanel } from "@features/site-publico/components/paineis/InscricoesPanel";

// Gestão de inscrições (secretaria). Mesma capacidade que edita o site
// (site_publico:manage), mas fora do hub do site — inscricoes e o
// acompanhamento das respostas sao trabalho de secretaria.
export default function InscricoesPage() {
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
      <HeaderLayout>
        <PageHeader title="Inscrições" />
        <div className="mt-4">
          <InscricoesPanel />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
