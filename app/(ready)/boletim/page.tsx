"use client";

import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { BoletimContent } from "@features/boletim/components/BoletimContent";

export default function BoletimPage() {
  return (
    <ModuloGuard modulo="boletim">
      <HeaderLayout>
        <PageHeader title="Boletim" />
        <BoletimContent />
      </HeaderLayout>
    </ModuloGuard>
  );
}
