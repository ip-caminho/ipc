"use client";

import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { SolicitacoesPanel } from "@features/membros/components/SolicitacoesPanel";

// Fila de solicitacoes de cadastro de familiar (self-service): a secretaria
// revisa e aprova (criar entidade + vinculo) ou rejeita. Gated por
// membros:create — mesma permissao da criacao canonica de membro.
export default function SolicitacoesFamiliaPage() {
  return (
    <PermissionGate
      permission="membros:create"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <HeaderLayout>
        <PageHeader title="Solicitações de cadastro" />
        <div className="mt-4">
          <SolicitacoesPanel />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
