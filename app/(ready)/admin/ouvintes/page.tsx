"use client";

import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { OuvintesPanel } from "@features/membros/components/OuvintesPanel";

export default function OuvintesPage() {
  return (
    <PermissionGate
      permission="membros:create"
      fallback={<p className="text-muted-foreground">Acesso restrito.</p>}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Ouvintes</h1>
          <p className="text-sm text-muted-foreground">
            Acesso externo (nao-membros) somente as gravacoes das pregacoes.
          </p>
        </div>
        <OuvintesPanel />
      </div>
    </PermissionGate>
  );
}
