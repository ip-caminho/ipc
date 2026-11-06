"use client";

import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@/shared/components/auth/SemPermissaoFallback";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { EmprestarForm } from "@features/biblioteca/components/EmprestarForm";

export default function EmprestarPage() {
  return (
    <PermissionGate permission="biblioteca:emprestar" fallback={<SemPermissaoFallback />}>
      <ModuloGuard modulo="biblioteca">
        <HeaderLayout>
          <EmprestarForm />
        </HeaderLayout>
      </ModuloGuard>
    </PermissionGate>
  );
}
