"use client";

import { MinhaEscalaUnificada } from "@features/escalas/components/MinhaEscalaUnificada";

export default function EscalasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Minha Escala</h1>
      <MinhaEscalaUnificada />
    </div>
  );
}
