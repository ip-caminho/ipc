"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { useEffect, useRef } from "react";

export default function EscalasLayout({ children }: { children: React.ReactNode }) {
  // Garantir cultos dominicais até o final do ano
  // @ts-ignore Convex TS2589
  const garantirCultos = useMutation(api.escalas.mutations.garantirCultosFuturos);
  const garantido = useRef(false);

  useEffect(() => {
    if (!garantido.current) {
      garantido.current = true;
      garantirCultos({}).catch(() => {});
    }
  }, [garantirCultos]);

  return (
    <ModuloGuard modulo="escalas">
      {children}
    </ModuloGuard>
  );
}
