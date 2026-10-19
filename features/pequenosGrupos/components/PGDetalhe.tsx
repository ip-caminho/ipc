"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@shared/lib/utils/cn";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, MapPin, Clock, Users, CalendarCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { PG_STATUS_COLORS, DIA_SEMANA_LABELS } from "../lib/constants";
import { MembrosPGList } from "./MembrosPGList";
import { PGForm } from "./PGForm";
import { PGEncontros } from "./PGEncontros";
import { PGFrequencia } from "./PGFrequencia";
import type { PGFormValues } from "../lib/validations";

interface PGDetalheProps {
  pgId: Id<"pequenosGrupos">;
  onBack: () => void;
}

// Busca sem acento/caixa: casa "Joao" com "João".
function normalizeBusca(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function PGDetalhe({ pgId, onBack }: PGDetalheProps) {
  const { can } = useAuth();
  // @ts-ignore Convex TS2589
  const pg = useQuery(api.pequenosGrupos.queries.getById, { id: pgId });
  const updatePG = useMutation(api.pequenosGrupos.mutations.update);
  const removePG = useMutation(api.pequenosGrupos.mutations.remove);
  const addMembro = useMutation(api.pequenosGrupos.mutations.addMembro);
  const removeMembro = useMutation(api.pequenosGrupos.mutations.removeMembro);
  const moveMembro = useMutation(api.pequenosGrupos.mutations.moveMembro);
  // @ts-ignore Convex TS2589
  const pgsAtivos = useQuery(api.pequenosGrupos.queries.list, { status: "ATIVO" });
  // @ts-ignore Convex TS2589
  const disponiveis = useQuery(api.pequenosGrupos.queries.listAllWithMembros, {});

  const [editOpen, setEditOpen] = useState(false);
  const [addMembroOpen, setAddMembroOpen] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState("");
  const [busca, setBusca] = useState("");
  const [movingMembroId, setMovingMembroId] = useState<Id<"membros"> | null>(null);

  // Comungantes que ainda nao estao neste PG (um membro pode estar em varios),
  // filtrados pela busca e em ordem alfabetica.
  const membrosDisponiveis = useMemo(() => {
    const lista = disponiveis?.comungantes ?? [];
    const jaNoGrupo = new Set((pg?.membros ?? []).map((m) => m.membroId));
    const termo = normalizeBusca(busca);
    return lista
      .filter((m: any) => !jaNoGrupo.has(m.membroId))
      .filter((m: any) => !termo || normalizeBusca(m.nome).includes(termo))
      .map((m: any) => ({ id: m.membroId as string, nome: (m.nome as string) || "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [disponiveis?.comungantes, pg?.membros, busca]);

  if (pg === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!pg) {
    return <p className="text-sm text-muted-foreground">PG nao encontrado</p>;
  }

  const handleUpdate = async (data: PGFormValues) => {
    try {
      await updatePG({
        id: pgId,
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
      toast.success("PG atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  };

  const handleRemove = async () => {
    if (!confirm("Tem certeza que deseja excluir este PG?")) return;
    try {
      await removePG({ id: pgId });
      toast.success("PG excluido");
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  const handleAddMembro = async () => {
    if (!selectedMembroId) return;
    try {
      await addMembro({
        pgId,
        membroId: selectedMembroId as Id<"membros">,
      });
      toast.success("Membro adicionado");
      setAddMembroOpen(false);
      setSelectedMembroId("");
      setBusca("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar");
    }
  };

  const handleRemoveMembro = async (pmId: Id<"pgMembros">) => {
    try {
      await removeMembro({ id: pmId });
      toast.success("Membro removido do PG");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover");
    }
  };

  const handleMoveMembro = async (toPgId: Id<"pequenosGrupos">) => {
    if (!movingMembroId) return;
    try {
      await moveMembro({ membroId: movingMembroId, fromPgId: pgId, toPgId });
      toast.success("Membro movido");
      setMovingMembroId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao mover");
    }
  };

  const outrosPgs = (pgsAtivos ?? []).filter((g: { _id: Id<"pequenosGrupos"> }) => g._id !== pgId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold flex-1">{pg.nome}</h2>
        {can("pequenos_grupos:update") && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
        )}
        {can("pequenos_grupos:delete") && (
          <Button variant="destructive" size="sm" onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={PG_STATUS_COLORS[pg.status] || ""}>
              {pg.status}
            </Badge>
          </div>
          {pg.descricao && (
            <p className="text-sm text-muted-foreground">{pg.descricao}</p>
          )}
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="font-medium">Lider:</span> {pg.liderNome}
            </p>
            {pg.coliderNome && (
              <p>
                <span className="font-medium">Co-lider:</span> {pg.coliderNome}
              </p>
            )}
            {pg.diaSemana && (
              <p className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {DIA_SEMANA_LABELS[pg.diaSemana] || pg.diaSemana}
                {pg.horario && ` - ${pg.horario}`}
              </p>
            )}
            {pg.local && (
              <p className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {pg.local}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="membros">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none">
          <TabsTrigger value="membros" className="shrink-0 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Membros ({pg.membros.length})
          </TabsTrigger>
          <TabsTrigger value="encontros" className="shrink-0 gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Encontros
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="shrink-0 gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Frequencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membros" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Membros</CardTitle>
              {can("pequenos_grupos:update") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddMembroOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <MembrosPGList
                membros={pg.membros}
                canRemove={can("pequenos_grupos:update")}
                onRemove={handleRemoveMembro}
                onMove={setMovingMembroId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encontros" className="mt-4">
          <PGEncontros pgId={pgId} membros={pg.membros} canEdit={can("pequenos_grupos:update")} />
        </TabsContent>

        <TabsContent value="frequencia" className="mt-4">
          <PGFrequencia pgId={pgId} />
        </TabsContent>
      </Tabs>

      {/* Dialog: Editar PG */}
      <PGForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        isEditing
        defaultValues={{
          nome: pg.nome,
          descricao: pg.descricao || "",
          liderId: pg.liderId,
          coliderId: pg.coliderId || "",
          diaSemana: pg.diaSemana || "",
          horario: pg.horario || "",
          local: pg.local || "",
        }}
      />

      {/* Drawer: Mover membro para outro grupo (mobile) */}
      <ResponsiveDialog
        open={movingMembroId !== null}
        onOpenChange={(open) => {
          if (!open) setMovingMembroId(null);
        }}
      >
        <ResponsiveDialogContent className="md:hidden">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Mover para outro grupo</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            {pgsAtivos === undefined ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : outrosPgs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum outro grupo</p>
            ) : (
              <ul className="space-y-0.5">
                {outrosPgs.map((g: { _id: Id<"pequenosGrupos">; nome: string }) => (
                  <li key={g._id}>
                    <button
                      type="button"
                      onClick={() => handleMoveMembro(g._id)}
                      className="flex min-h-11 w-full items-center rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted active:bg-muted"
                    >
                      {g.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Dialog: Adicionar Membro */}
      <ResponsiveDialog
        open={addMembroOpen}
        onOpenChange={(open) => {
          setAddMembroOpen(open);
          if (!open) {
            setSelectedMembroId("");
            setBusca("");
          }
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Adicionar membro ao PG</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-3">
          <Input
            type="search"
            enterKeyHint="search"
            placeholder="Buscar membro pelo nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto">
            {disponiveis === undefined ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </p>
            ) : membrosDisponiveis.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {busca ? "Nenhum membro encontrado" : "Nenhum membro disponivel"}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {membrosDisponiveis.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMembroId(m.id)}
                      className={cn(
                        "flex min-h-[44px] w-full items-center rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                        selectedMembroId === m.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted active:bg-muted",
                      )}
                    >
                      {m.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setAddMembroOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="h-11 md:h-9" onClick={handleAddMembro} disabled={!selectedMembroId}>
              Adicionar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
