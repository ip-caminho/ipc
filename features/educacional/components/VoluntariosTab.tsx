"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, HeartHandshake } from "lucide-react";
import { VoluntarioCard } from "./VoluntarioCard";
import { VoluntarioForm } from "./VoluntarioForm";
import { EduEmptyState } from "./EduEmptyState";
import {
  TURMA_OPTIONS,
  PAPEL_VOLUNTARIO_OPTIONS,
} from "../lib/constants";
import type { VoluntarioFormValues } from "../lib/validations";

export function VoluntariosTab() {
  const { can } = useAuth();
  const canManage = can("voluntarios_edu:manage");

  const [papelFilter, setPapelFilter] = useState<string>("all");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // @ts-ignore Convex TS2589
  const voluntarios = useQuery(api.educacional.queries.listVoluntarios, {
    papelEdu: papelFilter === "all" ? undefined : papelFilter,
    turma: turmaFilter === "all" ? undefined : turmaFilter,
  });

  const createVoluntario = useMutation(api.educacional.mutations.createVoluntario);
  const updateVoluntario = useMutation(api.educacional.mutations.updateVoluntario);
  const removeVoluntario = useMutation(api.educacional.mutations.removeVoluntario);

  const handleCreate = async (data: VoluntarioFormValues) => {
    try {
      await createVoluntario({
        membroId: data.membroId as Id<"membros">,
        papelEdu: data.papelEdu,
        turmasHabilitadas: data.turmasHabilitadas,
        cbcm: data.cbcm,
        cacValidade: data.cacValidade || undefined,
        certificadoCacUrl: data.certificadoCacUrl || undefined,
        observacoes: data.observacoes || undefined,
      });
      toast.success("Voluntario cadastrado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleEdit = async (data: VoluntarioFormValues) => {
    if (!editing) return;
    try {
      await updateVoluntario({
        id: editing._id as Id<"eduVoluntarios">,
        papelEdu: data.papelEdu,
        turmasHabilitadas: data.turmasHabilitadas,
        cbcm: data.cbcm,
        cacValidade: data.cacValidade || null,
        certificadoCacUrl: data.certificadoCacUrl || null,
        observacoes: data.observacoes || null,
      });
      toast.success("Voluntario atualizado");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este voluntario?")) return;
    try {
      await removeVoluntario({ id: id as Id<"eduVoluntarios"> });
      toast.success("Voluntario removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Select value={papelFilter} onValueChange={setPapelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos os papeis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papeis</SelectItem>
              {PAPEL_VOLUNTARIO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {TURMA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PermissionGate permission="voluntarios_edu:manage">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Voluntario
          </Button>
        </PermissionGate>
      </div>

      {voluntarios === undefined ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : voluntarios.length === 0 ? (
        <EduEmptyState
          icon={HeartHandshake}
          title="Nenhum voluntario"
          description={
            papelFilter !== "all" || turmaFilter !== "all"
              ? "Nenhum voluntario para os filtros selecionados."
              : "Cadastre os professores, auxiliares e apoios do departamento."
          }
          action={
            canManage && papelFilter === "all" && turmaFilter === "all" ? (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Voluntario
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {voluntarios.length} voluntario{voluntarios.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {voluntarios.map((v: any) => (
              <VoluntarioCard
                key={v._id}
                voluntario={v}
                canManage={canManage}
                onEdit={() => setEditing(v)}
                onDelete={() => handleDelete(v._id)}
              />
            ))}
          </div>
        </>
      )}

      <VoluntarioForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />
      {editing && (
        <VoluntarioForm
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSubmit={handleEdit}
          isEditing
          membroNome={editing.nome}
          defaultValues={{
            membroId: editing.membroId,
            papelEdu: editing.papelEdu,
            turmasHabilitadas: editing.turmasHabilitadas,
            cbcm: editing.cbcm,
            cacValidade: editing.cacValidade,
            certificadoCacUrl: editing.certificadoCacUrl,
            observacoes: editing.observacoes,
          }}
        />
      )}
    </div>
  );
}
