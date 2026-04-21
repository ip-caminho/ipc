"use client";

import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { MinhaEscalaUnificada } from "@features/escalas/components/MinhaEscalaUnificada";

export default function EscalasPage() {
  return (
    <HeaderLayout>
      <div className="space-y-4">
        <PageHeader title="Minha Escala" />
        <MinhaEscalaUnificada />
      </div>
    </HeaderLayout>
  );
}
