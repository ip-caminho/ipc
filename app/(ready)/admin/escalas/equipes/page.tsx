"use client";

import { AdminGate } from "@shared/components/auth/RoleGate";
import { EquipesTab } from "@features/escalas/components/EquipesTab";

export default function EquipesPage() {
  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito</p>}>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Equipes</h1>
        <EquipesTab />
      </div>
    </AdminGate>
  );
}
