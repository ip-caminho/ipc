"use client";

import { useState } from "react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
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
          <PageHeader title="Avisos" />
          <div className="flex items-center justify-end">
            {can("escalas:create") && !showForm && (
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Novo aviso
              </Button>
            )}
          </div>
          <AvisosSection showForm={showForm} setShowForm={setShowForm} />
        </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
