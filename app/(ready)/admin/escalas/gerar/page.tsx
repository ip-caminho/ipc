"use client";

import { AdminGate } from "@shared/components/auth/RoleGate";
import { GerarEscalasTab } from "@features/escalas/components/GerarEscalasTab";

export default function GerarEscalasPage() {
  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito</p>}>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Gerar Escalas</h1>
        <GerarEscalasTab />
      </div>
    </AdminGate>
  );
}
