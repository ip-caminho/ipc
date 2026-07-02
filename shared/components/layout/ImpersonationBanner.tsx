"use client";

import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Eye, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  pastor: "Pastor",
  presbitero: "Presbítero",
  obreiro: "Obreiro",
  secretaria: "Secretária",
  secretario_executivo: "Secretário Executivo",
  membro: "Membro",
};

export function ImpersonationBanner() {
  const { isImpersonating, role, stopImpersonating } = useAuth();

  if (!isImpersonating || !role) return null;

  return (
    <div className="bg-amber-400 dark:bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 -mx-4 -mt-4 mb-2 md:-mx-6 md:-mt-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          Visualizando como <strong>{ROLE_LABELS[role] || role}</strong>
          <span className="font-normal"> — prévia visual; suas ações continuam com as permissões reais de admin</span>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 bg-white/80 hover:bg-white border-amber-600 text-amber-950 shrink-0"
        onClick={stopImpersonating}
      >
        <X className="h-3.5 w-3.5 mr-1" />
        Sair
      </Button>
    </div>
  );
}
