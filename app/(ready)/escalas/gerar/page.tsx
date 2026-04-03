"use client";

import { GerarEscalasTab } from "@features/escalas/components/GerarEscalasTab";
import { SubPageHeader } from "@features/escalas/components/SubPageHeader";

export default function GerarEscalasPage() {
  return (
    <>
      <SubPageHeader title="Gerar Escalas" />
      <div className="md:mt-4">
        <GerarEscalasTab />
      </div>
    </>
  );
}
