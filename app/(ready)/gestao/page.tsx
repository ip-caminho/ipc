"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NavSectionList } from "@features/navigation/components/NavSectionList";
import { GESTAO_SECTIONS, ELEVATED_ROLES } from "@shared/constants/navigation";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";

export default function GestaoPage() {
  const { hasAnyRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasAnyRole(ELEVATED_ROLES)) {
      router.replace("/dashboard");
    }
  }, [isLoading, hasAnyRole, router]);

  if (isLoading || !hasAnyRole(ELEVATED_ROLES)) {
    return null;
  }

  return (
    <HeaderLayout>
      <div className="max-w-2xl mx-auto w-full">
        <PageHeader
          title="Gestão"
          subtitle="Ferramentas operacionais da igreja"
        />
        <div className="mt-6">
          <NavSectionList
            sections={GESTAO_SECTIONS}
            emptyMessage="Sem itens de gestão disponíveis para o seu perfil."
          />
        </div>
      </div>
    </HeaderLayout>
  );
}
