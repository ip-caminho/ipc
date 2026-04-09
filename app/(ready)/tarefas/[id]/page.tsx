"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { ArrowLeft, Calendar, Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { TarefaStatusBadge } from "@features/tarefas/components/TarefaStatusBadge";
import { TarefaPrioridadeBadge } from "@features/tarefas/components/TarefaPrioridadeBadge";
import { TarefaForm } from "@features/tarefas/components/TarefaForm";
import { ComentariosThread } from "@/shared/components/ComentariosThread";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { STATUS_OPTIONS } from "@features/tarefas/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function TarefaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can, isAdmin } = useAuth();
  const tarefa = useQuery(api.tarefas.queries.getById, { id: id as Id<"tarefas"> });
  const updateStatus = useMutation(api.tarefas.mutations.updateStatus);
  const removeTarefa = useMutation(api.tarefas.mutations.remove);

  const [editOpen, setEditOpen] = useState(false);

  if (tarefa === undefined) return <div className="p-6">Carregando...</div>;
  if (tarefa === null) return <div className="p-6">Tarefa nao encontrada</div>;

  const canEdit = tarefa.isOwner || can("tarefas:update");
  const canDelete = tarefa.isOwner || can("tarefas:delete");
  const canChangeStatus = tarefa.isOwner || tarefa.isResponsavel || can("tarefas:update");

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatus({ id: id as Id<"tarefas">, status: newStatus as any });
      toast.success("Status atualizado");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete() {
    if (!confirm("Excluir esta tarefa?")) return;
    try {
      await removeTarefa({ id: id as Id<"tarefas"> });
      toast.success("Tarefa excluida");
      router.push("/tarefas");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <ModuloGuard modulo="tarefas">
      <div className="container max-w-3xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/tarefas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-xl">{tarefa.titulo}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <TarefaStatusBadge status={tarefa.status} />
                  <TarefaPrioridadeBadge prioridade={tarefa.prioridade} />
                  {tarefa.dataVencimento && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(tarefa.dataVencimento)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outline" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tarefa.descricao && (
              <p className="text-sm whitespace-pre-wrap">{tarefa.descricao}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Responsável</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {tarefa.responsavelFoto && <AvatarImage src={tarefa.responsavelFoto} />}
                    <AvatarFallback className="text-[10px]">{tarefa.responsavelNome?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{tarefa.responsavelNome}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Criado por</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {tarefa.criadorFoto && <AvatarImage src={tarefa.criadorFoto} />}
                    <AvatarFallback className="text-[10px]">{tarefa.criadorNome?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{tarefa.criadorNome}</span>
                </div>
              </div>
            </div>

            {canChangeStatus && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Alterar status</p>
                <Select value={tarefa.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comentários</CardTitle>
          </CardHeader>
          <CardContent>
            <ComentariosThread entidadeTipo="tarefas" entidadeId={id} />
          </CardContent>
        </Card>

        <TarefaForm
          open={editOpen}
          onOpenChange={setEditOpen}
          tarefaId={id as Id<"tarefas">}
          defaultValues={{
            titulo: tarefa.titulo,
            descricao: tarefa.descricao || "",
            prioridade: tarefa.prioridade as any,
            responsavelId: tarefa.responsavelId,
            dataVencimento: tarefa.dataVencimento || "",
          }}
        />
      </div>
    </ModuloGuard>
  );
}
