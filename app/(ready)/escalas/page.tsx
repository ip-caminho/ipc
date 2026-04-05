"use client";

import { MinhaEscalaUnificada } from "@features/escalas/components/MinhaEscalaUnificada";
import { DisponibilidadeTab } from "@features/escalas/components/DisponibilidadeTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { CalendarCheck, CalendarOff } from "lucide-react";

export default function EscalasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Minha Escala</h1>

      <Tabs defaultValue="escala">
        <TabsList>
          <TabsTrigger value="escala" className="gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Escala
          </TabsTrigger>
          <TabsTrigger value="disponibilidade" className="gap-1.5">
            <CalendarOff className="h-3.5 w-3.5" />
            Disponibilidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escala" className="mt-4">
          <MinhaEscalaUnificada />
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-4">
          <DisponibilidadeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
