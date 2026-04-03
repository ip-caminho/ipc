"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

const TABS = [
  { value: "/escalas", label: "Minha Escala" },
  { value: "/escalas/gerar", label: "Gerar Escalas", permission: "escalas:update" as const },
  { value: "/escalas/equipes", label: "Equipes", permission: "escalas:update" as const },
];

export default function EscalasLayout({ children }: { children: React.ReactNode }) {
  const { can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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

  const visibleTabs = TABS.filter((t) => !t.permission || can(t.permission));

  return (
    <ModuloGuard modulo="escalas">
      <div className="space-y-4">
        <h1 className="hidden md:block text-2xl font-bold">Escalas</h1>

        {/* Desktop: tabs como navegação */}
        <div className="hidden md:block">
          <Tabs value={pathname} onValueChange={(v) => router.push(v)}>
            <TabsList>
              {visibleTabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {children}
      </div>
    </ModuloGuard>
  );
}
