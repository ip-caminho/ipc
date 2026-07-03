"use client";

import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { AcessoPanel } from "@features/membros/components/AcessoPanel";

export default function AcessoPage() {
  return (
    <PermissionGate
      permission="acesso:manage"
      fallback={
        <HeaderLayout>
          <div className="max-w-md mx-auto text-center pt-12">
            <h1 className="text-xl font-medium">Sem acesso</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Você não tem permissão para gerenciar o acesso ao sistema.
            </p>
          </div>
        </HeaderLayout>
      }
    >
      <HeaderLayout>
        <div className="space-y-4">
          <PageHeader
            title="Acesso ao sistema"
            subtitle="Links de ativação, reset de senha, link de convidado e atividade"
          />
          <AcessoPanel />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
