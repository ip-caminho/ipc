"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import {
  Plus,
  ClipboardList,
  HandHeart,
  FileText,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@shared/hooks/useDebounce";

import { VisitaForm } from "@features/pastoreio/components/VisitaForm";
import { VisitaCard } from "@features/pastoreio/components/VisitaCard";
import { PedidoOracaoForm } from "@features/pastoreio/components/PedidoOracaoForm";
import { PedidoOracaoCard } from "@features/pastoreio/components/PedidoOracaoCard";
import { AnotacaoForm } from "@features/pastoreio/components/AnotacaoForm";
import { AnotacaoCard } from "@features/pastoreio/components/AnotacaoCard";
import { MembroPerfilPastoral } from "@features/pastoreio/components/MembroPerfilPastoral";

import type { VisitaFormValues } from "@features/pastoreio/lib/validations";
import type { PedidoOracaoFormValues } from "@features/pastoreio/lib/validations";
import type { AnotacaoFormValues } from "@features/pastoreio/lib/validations";

const CARGO_LABELS: Record<string, string> = {
  MEMBRO_COMUNGANTE: "Membro",
  MEMBRO_NAO_COMUNGANTE: "Nao Comungante",
  DIACONO: "Diacono",
  PRESBITERO: "Presbitero",
  PASTOR: "Pastor",
};

export default function PastoreioPage() {
  const { can } = useAuth();

  const canReadPastoreio = can("pastoreio:read");
  const canReadPedidos = can("pedidos_oracao:read");

  // Member search
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedMembroId, setSelectedMembroId] = useState<Id<"membros"> | null>(
    null
  );

  // Queries
  const membrosResumo = useQuery(
    api.pastoreio.queries.listMembrosResumo,
    canReadPastoreio ? { search: debouncedSearch || undefined } : "skip"
  );
  const visitas = useQuery(
    api.pastoreio.queries.listVisitas,
    canReadPastoreio ? {} : "skip"
  );
  const pedidos = useQuery(
    api.pastoreio.queries.listPedidosOracao,
    canReadPedidos || canReadPastoreio ? {} : "skip"
  );
  const anotacoes = useQuery(
    api.pastoreio.queries.listAnotacoes,
    canReadPastoreio ? {} : "skip"
  );
  const stats = useQuery(
    api.pastoreio.queries.dashboardStats,
    canReadPastoreio ? {} : "skip"
  );

  // Mutations
  const createVisita = useMutation(api.pastoreio.mutations.createVisita);
  const removeVisita = useMutation(api.pastoreio.mutations.removeVisita);
  const createPedido = useMutation(api.pastoreio.mutations.createPedidoOracao);
  const updatePedido = useMutation(api.pastoreio.mutations.updatePedidoOracao);
  const arquivarPedido = useMutation(api.pastoreio.mutations.arquivarPedidoOracao);
  const createAnotacao = useMutation(api.pastoreio.mutations.createAnotacao);
  const removeAnotacao = useMutation(api.pastoreio.mutations.removeAnotacao);

  // State
  const [visitaFormOpen, setVisitaFormOpen] = useState(false);
  const [pedidoFormOpen, setPedidoFormOpen] = useState(false);
  const [anotacaoFormOpen, setAnotacaoFormOpen] = useState(false);

  // Default tab
  const defaultTab = canReadPastoreio ? "membros" : "pedidos";

  // --- If viewing a member profile ---
  if (selectedMembroId) {
    return (
      <ModuloGuard modulo="pastoreio">
      <MembroPerfilPastoral
        membroId={selectedMembroId}
        onBack={() => setSelectedMembroId(null)}
      />
      </ModuloGuard>
    );
  }

  // Handlers
  const handleCreateVisita = async (data: VisitaFormValues) => {
    try {
      await createVisita({
        membroId: data.membroId as Id<"membros">,
        visitanteId: data.visitanteId as Id<"membros">,
        data: data.data,
        tipo: data.tipo,
        observacoes: data.observacoes || undefined,
      });
      toast.success("Visita registrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleDeleteVisita = async (id: string) => {
    if (!confirm("Excluir esta visita?")) return;
    try {
      await removeVisita({ id: id as Id<"visitasPastorais"> });
      toast.success("Visita excluida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleCreatePedido = async (data: PedidoOracaoFormValues) => {
    try {
      await createPedido({ descricao: data.descricao });
      toast.success("Pedido de oracao enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleMarkAnswered = async (id: string) => {
    try {
      await updatePedido({
        id: id as Id<"pedidosOracao">,
        status: "RESPONDIDO",
      });
      toast.success("Pedido marcado como respondido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleArchivePedido = async (id: string) => {
    try {
      await arquivarPedido({ id: id as Id<"pedidosOracao"> });
      toast.success("Pedido arquivado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleCreateAnotacao = async (data: AnotacaoFormValues) => {
    try {
      await createAnotacao({
        membroId: data.membroId as Id<"membros">,
        texto: data.texto,
      });
      toast.success("Anotacao salva");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleDeleteAnotacao = async (id: string) => {
    if (!confirm("Excluir esta anotacao?")) return;
    try {
      await removeAnotacao({ id: id as Id<"anotacoesPastorais"> });
      toast.success("Anotacao excluida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  return (
    <ModuloGuard modulo="pastoreio">
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pastoreio</h1>

      {/* Stats */}
      {canReadPastoreio && stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Visitas este mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.visitasMes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Pedidos ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pedidosAtivos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Anotacoes recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.anotacoesRecentes}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canReadPastoreio && (
            <TabsTrigger value="membros" className="gap-1.5">
              <Users className="h-4 w-4" />
              Membros
            </TabsTrigger>
          )}
          {canReadPastoreio && (
            <TabsTrigger value="visitas" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Visitas
            </TabsTrigger>
          )}
          <TabsTrigger value="pedidos" className="gap-1.5">
            <HandHeart className="h-4 w-4" />
            Pedidos de Oracao
          </TabsTrigger>
          {canReadPastoreio && (
            <TabsTrigger value="anotacoes" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Anotacoes
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Membros */}
        {canReadPastoreio && (
          <TabsContent value="membros" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar membro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {membrosResumo === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : membrosResumo.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum membro encontrado
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {membrosResumo.map((m: any) => (
                  <Card
                    key={m._id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedMembroId(m._id)}
                  >
                    <CardContent className="flex items-center gap-3 py-3">
                      <Avatar className="h-10 w-10">
                        {m.foto && <AvatarImage src={m.foto} />}
                        <AvatarFallback>
                          {m.nome?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.nome}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {m.cargoEclesiastico && (
                            <span className="text-xs text-muted-foreground">
                              {CARGO_LABELS[m.cargoEclesiastico] ||
                                m.cargoEclesiastico}
                            </span>
                          )}
                          {m.whatsapp && (
                            <span className="text-xs text-muted-foreground">
                              {m.cargoEclesiastico ? " · " : ""}
                              {m.whatsapp}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Tab: Visitas */}
        {canReadPastoreio && (
          <TabsContent value="visitas" className="space-y-4">
            <div className="flex justify-end">
              <PermissionGate permission="pastoreio:create">
                <Button onClick={() => setVisitaFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova visita
                </Button>
              </PermissionGate>
            </div>
            {visitas === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : visitas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma visita registrada
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visitas.map((v: any) => (
                  <VisitaCard
                    key={v._id}
                    visita={v}
                    canDelete={can("pastoreio:delete")}
                    onDelete={() => handleDeleteVisita(v._id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Tab: Pedidos de Oracao */}
        <TabsContent value="pedidos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPedidoFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo pedido
            </Button>
          </div>
          {pedidos === undefined ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum pedido de oracao
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pedidos.map((p: any) => (
                <PedidoOracaoCard
                  key={p._id}
                  pedido={p}
                  canChangeStatus={can("pastoreio:update")}
                  onMarkAnswered={() => handleMarkAnswered(p._id)}
                  onArchive={() => handleArchivePedido(p._id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Anotacoes */}
        {canReadPastoreio && (
          <TabsContent value="anotacoes" className="space-y-4">
            <div className="flex justify-end">
              <PermissionGate permission="pastoreio:create">
                <Button onClick={() => setAnotacaoFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova anotacao
                </Button>
              </PermissionGate>
            </div>
            {anotacoes === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : anotacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma anotacao pastoral
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {anotacoes.map((a: any) => (
                  <AnotacaoCard
                    key={a._id}
                    anotacao={a}
                    canDelete={can("pastoreio:delete")}
                    onDelete={() => handleDeleteAnotacao(a._id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Forms */}
      <VisitaForm
        open={visitaFormOpen}
        onOpenChange={setVisitaFormOpen}
        onSubmit={handleCreateVisita}
      />
      <PedidoOracaoForm
        open={pedidoFormOpen}
        onOpenChange={setPedidoFormOpen}
        onSubmit={handleCreatePedido}
      />
      <AnotacaoForm
        open={anotacaoFormOpen}
        onOpenChange={setAnotacaoFormOpen}
        onSubmit={handleCreateAnotacao}
      />
    </div>
    </ModuloGuard>
  );
}
