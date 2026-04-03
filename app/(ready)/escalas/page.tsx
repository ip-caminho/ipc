"use client";

import { MinhasEquipesTab } from "@features/escalas/components/MinhasEquipesTab";
import { MinhaEscalaUnificada } from "@features/escalas/components/MinhaEscalaUnificada";

export default function EscalasPage() {
  return (
    <>
      {/* Mobile: escala unificada */}
      <div className="md:hidden space-y-6">
        <h1 className="text-2xl font-bold">Servir</h1>
        <MinhaEscalaUnificada />
      </div>

      {/* Desktop: só o conteúdo da tab */}
      <div className="hidden md:block mt-4">
        <MinhasEquipesTab />
      </div>
    </>
  );
}
