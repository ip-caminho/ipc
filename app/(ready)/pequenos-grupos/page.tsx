"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, ArrowLeftRight, ArrowLeft, UserX } from "lucide-react";
import { toast } from "sonner";
import { PGCard } from "@features/pequenosGrupos/components/PGCard";
import { PGForm } from "@features/pequenosGrupos/components/PGForm";
import { PGDetalhe } from "@features/pequenosGrupos/components/PGDetalhe";
import { PGRemanejamento } from "@features/pequenosGrupos/components/PGRemanejamento";
import type { PGFormValues } from "@features/pequenosGrupos/lib/validations";

export default function PequenosGruposPage() {
  const { can } = useAuth();
  // @ts-ignore Convex TS2589
  const pgs = useQuery(api.pequenosGrupos.queries.list, { status: "ATIVO" });
  // @ts-ignore Convex TS2589
  const allData = useQuery(api.pequenosGrupos.queries.listAllWithMembros, {});
  const createPG = useMutation(api.pequenosGrupos.mutations.create);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "remanejamento">("grid");
  const [selectedPgId, setSelectedPgId] = useState<Id<"pequenosGrupos"> | null>(
    null
  );

  const handleCreate = async (data: PGFormValues) => {
    try {
      await createPG({
        nome: data.nome,
        descricao: data.descricao || undefined,
        liderId: data.liderId as Id<"membros">,
        coliderId: data.coliderId
          ? (data.coliderId as Id<"membros">)
          : undefined,
        diaSemana: data.diaSemana || undefined,
        horario: data.horario || undefined,
        local: data.local || undefined,
      });
      toast.success("Pequeno grupo criado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar PG");
    }
  };

  if (selectedPgId) {
    return (
      <ModuloGuard modulo="pequenos-grupos">
      <PGDetalhe pgId={selectedPgId} onBack={() => setSelectedPgId(null)} />
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="pequenos-grupos">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {viewMode === "remanejamento" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {viewMode === "remanejamento"
              ? "Remanejar Membros"
              : "Pequenos Grupos"}
          </h1>
        </div>
        <div className="flex gap-2">
          {viewMode === "grid" && (
            <>
              <PermissionGate permission="pequenos_grupos:update">
                <Button
                  variant="outline"
                  onClick={() => setViewMode("remanejamento")}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Remanejar
                </Button>
              </PermissionGate>
              <PermissionGate permission="pequenos_grupos:create">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo PG
                </Button>
              </PermissionGate>
            </>
          )}
        </div>
      </div>
      {viewMode === "remanejamento" && (
        <p className="text-sm text-muted-foreground">
          Arraste os membros entre os grupos. As alteracoes sao salvas automaticamente.
        </p>
      )}

      {viewMode === "remanejamento" ? (
        <PGRemanejamento />
      ) : pgs === undefined ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : pgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum pequeno grupo cadastrado
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pgs.map((pg: any) => (
              <PGCard
                key={pg._id}
                pg={pg}
                onClick={() => setSelectedPgId(pg._id)}
              />
            ))}
          </div>

          {/* Membros sem grupo */}
          {allData && allData.semGrupo.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Sem grupo
                  <Badge variant="secondary">{allData.semGrupo.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allData.semGrupo.map((m: any) => (
                    <div
                      key={m.membroId}
                      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {m.nome?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{m.nome}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <PGForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
    </ModuloGuard>
  );
}
