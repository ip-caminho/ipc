"use client";

import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@shared/components/auth/SemPermissaoFallback";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { BoletimContent } from "@features/boletim/components/BoletimContent";

export default function BoletimPage() {
  return (
    <PermissionGate permission="escalas:read" fallback={<SemPermissaoFallback />}>
      <ModuloGuard modulo="boletim">
        <HeaderLayout>
          <div className="space-y-4">
            <PageHeader title="Boletim" />
            <BoletimContent />
          </div>
        </HeaderLayout>
      </ModuloGuard>
    </PermissionGate>
  );
}
