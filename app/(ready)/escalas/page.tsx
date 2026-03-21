"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { EquipesTab } from "@features/escalas/components/EquipesTab";
import { DisponibilidadeTab } from "@features/escalas/components/DisponibilidadeTab";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { MinhasEquipesTab } from "@features/escalas/components/MinhasEquipesTab";
import { GerarEscalasTab } from "@features/escalas/components/GerarEscalasTab";

export default function EscalasPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState("minha-escala");

  // Garantir cultos futuros (3 meses) ao abrir a página
  // @ts-ignore Convex TS2589
  const garantirCultos = useMutation(api.escalas.mutations.garantirCultosFuturos);
  const garantido = useRef(false);

  useEffect(() => {
    if (can("escalas:create") && !garantido.current) {
      garantido.current = true;
      garantirCultos({}).catch(() => {});
    }
  }, [can, garantirCultos]);

  return (
    <ModuloGuard modulo="escalas">
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Escalas</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="minha-escala">Minha Escala</TabsTrigger>
          <TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger>
          {can("escalas:update") && (
            <TabsTrigger value="gerar">Gerar Escalas</TabsTrigger>
          )}
          {can("escalas:update") && (
            <TabsTrigger value="equipes">Equipes</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="minha-escala" className="mt-4">
          <MinhasEquipesTab />
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-4">
          <DisponibilidadeTab />
        </TabsContent>

        {can("escalas:update") && (
          <TabsContent value="gerar" className="mt-4">
            <GerarEscalasTab />
          </TabsContent>
        )}

        {can("escalas:update") && (
          <TabsContent value="equipes" className="mt-4">
            <EquipesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
    </ModuloGuard>
  );
}
