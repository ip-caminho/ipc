"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { MinisterioCard } from "@features/ministerios/components/MinisterioCard";
import { MinisterioForm } from "@features/ministerios/components/MinisterioForm";
import { MinisterioDetalhe } from "@features/ministerios/components/MinisterioDetalhe";
import type { MinisterioFormValues } from "@features/ministerios/lib/validations";

export default function MinisteriosPage() {
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, { status: "ATIVO" });
  const createMin = useMutation(api.ministerios.mutations.create);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"ministerios"> | null>(null);

  const handleCreate = async (data: MinisterioFormValues) => {
    try {
      await createMin({
        nome: data.nome,
        descricao: data.descricao || undefined,
        papeis: data.papeis,
        subgrupos: data.subgrupos && data.subgrupos.length > 0 ? data.subgrupos : undefined,
      });
      toast.success("Ministerio criado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar ministerio");
    }
  };

  if (selectedId) {
    return (
      <ModuloGuard modulo="ministerios">
        <MinisterioDetalhe ministerioId={selectedId} onBack={() => setSelectedId(null)} />
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="ministerios">
      <HeaderLayout>
      <div className="space-y-4">
        <PageHeader title="Ministerios" />
        <div className="flex items-center justify-end">
          <PermissionGate permission="ministerios:create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ministerio
            </Button>
          </PermissionGate>
        </div>

        {ministerios === undefined ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : ministerios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum ministerio cadastrado
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ministerios.map((min: any) => (
              <MinisterioCard
                key={min._id}
                ministerio={min}
                onClick={() => setSelectedId(min._id)}
              />
            ))}
          </div>
        )}

        <MinisterioForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
        />
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
