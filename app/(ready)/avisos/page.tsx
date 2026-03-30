"use client";

import { useState } from "react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { AvisosSection } from "@features/avisos/components/AvisosSection";

export default function AvisosPage() {
  const { can } = useAuth();
  const [showForm, setShowForm] = useState(false);

  return (
    <ModuloGuard modulo="escalas">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Avisos</h1>
          {can("escalas:create") && !showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo aviso
            </Button>
          )}
        </div>
        <AvisosSection showForm={showForm} setShowForm={setShowForm} />
      </div>
    </ModuloGuard>
  );
}
