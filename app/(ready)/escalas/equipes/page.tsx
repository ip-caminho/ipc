"use client";

import { EquipesTab } from "@features/escalas/components/EquipesTab";
import { SubPageHeader } from "@features/escalas/components/SubPageHeader";

export default function EquipesPage() {
  return (
    <>
      <SubPageHeader title="Equipes" />
      <div className="md:mt-4">
        <EquipesTab />
      </div>
    </>
  );
}
