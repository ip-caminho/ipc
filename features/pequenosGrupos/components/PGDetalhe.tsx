"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
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

export function PGDetalhe({ pgId, onBack }: PGDetalheProps) {
  const { can } = useAuth();
  const pg = useQuery(api.pequenosGrupos.queries.getById, { id: pgId });
  const updatePG = useMutation(api.pequenosGrupos.mutations.update);
  const removePG = useMutation(api.pequenosGrupos.mutations.remove);
  const addMembro = useMutation(api.pequenosGrupos.mutations.addMembro);
  const removeMembro = useMutation(api.pequenosGrupos.mutations.removeMembro);
  const membros = useQuery(api.membros.queries.list, {});

  const [editOpen, setEditOpen] = useState(false);
  const [addMembroOpen, setAddMembroOpen] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState("");

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

      {/* Dialog: Adicionar Membro */}
      <Dialog open={addMembroOpen} onOpenChange={setAddMembroOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar membro ao PG</DialogTitle>
          </DialogHeader>
          <Select
            value={selectedMembroId}
            onValueChange={setSelectedMembroId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um membro" />
            </SelectTrigger>
            <SelectContent>
              {membros?.map((m: any) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.entidade?.nomeCompleto || "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMembroOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddMembro} disabled={!selectedMembroId}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
