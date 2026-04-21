"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Plus } from "lucide-react";
import { TurmaCard } from "@features/turmas/components/TurmaCard";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { parseAsString, useQueryState } from "nuqs";
import { TurmaFormDialog } from "@features/turmas/components/TurmaFormDialog";

export default function TurmasPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter] = useQueryState("status", parseAsString.withDefault(""));

  const turmas = useQuery(api.turmas.queries.listTurmas, {
    status: statusFilter || undefined,
  });

  return (
    <ModuloGuard modulo="turmas">
      <HeaderLayout>
      <div className="container max-w-4xl py-6 space-y-4">
        <PageHeader title="Turmas" />
        <div className="flex items-center justify-end">
          <PermissionGate permission="turmas:create">
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Turma
            </Button>
          </PermissionGate>
        </div>

        <Tabs defaultValue="ABERTA">
          <TabsList>
            <TabsTrigger value="ABERTA">Abertas</TabsTrigger>
            <TabsTrigger value="EM_ANDAMENTO">Em andamento</TabsTrigger>
            <TabsTrigger value="ENCERRADA">Encerradas</TabsTrigger>
            <TabsTrigger value="">Todas</TabsTrigger>
          </TabsList>

          {["ABERTA", "EM_ANDAMENTO", "ENCERRADA", ""].map((status) => (
            <TabsContent key={status || "all"} value={status}>
              {!turmas ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                  {turmas
                    .filter((t: any) => !status || t.status === status)
                    .map((t: any) => (
                      <TurmaCard key={t._id} turma={t} />
                    ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <TurmaFormDialog open={formOpen} onOpenChange={setFormOpen} />
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
