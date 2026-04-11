"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NavSectionList } from "@features/navigation/components/NavSectionList";
import { GESTAO_SECTIONS, ELEVATED_ROLES } from "@shared/constants/navigation";
import { useAuth } from "@shared/providers/PermissionsProvider";

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
    <div className="max-w-2xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-medium">Gestão</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramentas operacionais da igreja
        </p>
      </header>
      <NavSectionList
        sections={GESTAO_SECTIONS}
        emptyMessage="Sem itens de gestão disponíveis para o seu perfil."
      />
    </div>
  );
}
