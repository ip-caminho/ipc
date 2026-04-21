"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus } from "lucide-react";
import { TarefaCard } from "@features/tarefas/components/TarefaCard";
import { TarefaForm } from "@features/tarefas/components/TarefaForm";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { parseAsString, useQueryState } from "nuqs";

export default function TarefasPage() {
  const { can } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("MINHAS"));
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString.withDefault(""));

  const tarefas = useQuery(api.tarefas.queries.list, {
    filtro: tab as any,
    status: statusFilter ? (statusFilter as any) : undefined,
  });

  return (
    <ModuloGuard modulo="tarefas">
      <HeaderLayout>
      <div className="container max-w-4xl py-6 space-y-4">
        <PageHeader title="Tarefas" />
        <div className="flex items-center justify-end">
          <PermissionGate permission="tarefas:create">
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Tarefa
            </Button>
          </PermissionGate>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="MINHAS">Minhas</TabsTrigger>
              <TabsTrigger value="CRIADAS">Criadas por mim</TabsTrigger>
              {can("tarefas:read") && <TabsTrigger value="TODAS">Todas</TabsTrigger>}
            </TabsList>

            <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value={tab} className="mt-4">
            {!tarefas ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : tarefas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhuma tarefa encontrada
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {tarefas.map((t: any) => (
                  <TarefaCard key={t._id} tarefa={t} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <TarefaForm open={formOpen} onOpenChange={setFormOpen} />
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
