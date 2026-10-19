"use client";

import { useState } from "react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { MobileFab } from "@shared/components/layout/MobileFab";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { AvisosSection } from "@features/avisos/components/AvisosSection";

export default function AvisosPage() {
  const { can } = useAuth();
  const [showForm, setShowForm] = useState(false);

  return (
    <ModuloGuard modulo="escalas">
      <HeaderLayout>
        <div className="space-y-4">
          <PageHeader title="Cadastrar Aviso" />
          <div className="flex items-center justify-end">
            {can("avisos:create") && !showForm && (
              <Button size="sm" variant="outline" className="hidden md:inline-flex" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Novo aviso
              </Button>
            )}
          </div>
          <AvisosSection showForm={showForm} setShowForm={setShowForm} />
          {can("avisos:create") && !showForm && (
            <MobileFab label="Novo aviso" onClick={() => setShowForm(true)} />
          )}
        </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
