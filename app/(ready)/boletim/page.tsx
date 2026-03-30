"use client";

import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { BoletimContent } from "@features/boletim/components/BoletimContent";

export default function BoletimPage() {
  return (
    <ModuloGuard modulo="boletim">
      <BoletimContent />
    </ModuloGuard>
  );
}
