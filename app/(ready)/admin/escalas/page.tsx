"use client";

import { AdminGate } from "@shared/components/auth/RoleGate";
import { EquipesTab } from "@features/escalas/components/EquipesTab";
import { GerarEscalasTab } from "@features/escalas/components/GerarEscalasTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Users, CalendarCheck } from "lucide-react";

export default function AdminEscalasPage() {
  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito</p>}>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Equipes e Escalas</h1>

        <Tabs defaultValue="equipes">
          <TabsList>
            <TabsTrigger value="equipes" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Equipes
            </TabsTrigger>
            <TabsTrigger value="gerar" className="gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" />
              Gerar Escalas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipes" className="mt-4">
            <EquipesTab />
          </TabsContent>

          <TabsContent value="gerar" className="mt-4">
            <GerarEscalasTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  );
}
