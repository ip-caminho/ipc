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
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { MINISTERIO_STATUS_COLORS, CBCM_COLORS, CBCM_LABELS } from "../lib/constants";
import { MinisterioForm } from "./MinisterioForm";
import type { MinisterioFormValues } from "../lib/validations";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";

interface MinisterioDetalheProps {
  ministerioId: Id<"ministerios">;
  onBack: () => void;
}

export function MinisterioDetalhe({ ministerioId, onBack }: MinisterioDetalheProps) {
  const { can } = useAuth();
  const ministerio = useQuery(api.ministerios.queries.getById, { id: ministerioId });
  const updateMin = useMutation(api.ministerios.mutations.update);
  const removeMin = useMutation(api.ministerios.mutations.remove);
  const addMembroMut = useMutation(api.ministerios.mutations.addMembro);
  const removeMembroMut = useMutation(api.ministerios.mutations.removeMembro);
  const membros = useQuery(api.membros.queries.list, {});

  const [editOpen, setEditOpen] = useState(false);
  const [addMembroOpen, setAddMembroOpen] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState("");
  const [selectedPapel, setSelectedPapel] = useState("");
  const [selectedSubgrupos, setSelectedSubgrupos] = useState<string[]>([]);

  if (ministerio === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!ministerio) {
    return <p className="text-sm text-muted-foreground">Ministerio nao encontrado</p>;
  }

  const handleUpdate = async (data: MinisterioFormValues) => {
    try {
      await updateMin({
        id: ministerioId,
        nome: data.nome,
        descricao: data.descricao || undefined,
        papeis: data.papeis,
        subgrupos: data.subgrupos || undefined,
      });
      toast.success("Ministerio atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  };

  const handleRemove = async () => {
    if (!confirm("Tem certeza que deseja excluir este ministerio?")) return;
    try {
      await removeMin({ id: ministerioId });
      toast.success("Ministerio excluido");
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  const handleAddMembro = async () => {
    if (!selectedMembroId || !selectedPapel) return;
    try {
      await addMembroMut({
        ministerioId,
        membroId: selectedMembroId as Id<"membros">,
        papel: selectedPapel,
        subgrupos: selectedSubgrupos.length > 0 ? selectedSubgrupos : undefined,
      });
      toast.success("Membro adicionado");
      setAddMembroOpen(false);
      setSelectedMembroId("");
      setSelectedPapel("");
      setSelectedSubgrupos([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar");
    }
  };

  const handleRemoveMembro = async (mmId: Id<"ministerioMembros">) => {
    try {
      await removeMembroMut({ id: mmId });
      toast.success("Membro removido do ministerio");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover");
    }
  };

  const membrosAtivos = ministerio.membros.filter((m: any) => m.status === "ATIVO");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold flex-1">{ministerio.nome}</h2>
        {can("ministerios:update") && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
        )}
        {can("ministerios:delete") && (
          <Button variant="destructive" size="sm" onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={MINISTERIO_STATUS_COLORS[ministerio.status] || ""}>
              {ministerio.status}
            </Badge>
          </div>
          {ministerio.descricao && (
            <p className="text-sm text-muted-foreground">{ministerio.descricao}</p>
          )}
          {ministerio.papeis.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Papeis:</p>
              <div className="flex flex-wrap gap-1.5">
                {ministerio.papeis.map((p: string) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {ministerio.subgrupos && ministerio.subgrupos.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Subgrupos:</p>
              <div className="flex flex-wrap gap-1.5">
                {ministerio.subgrupos.map((s: string) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros ({membrosAtivos.length})
          </CardTitle>
          {can("ministerios:update") && (
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
          {membrosAtivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro neste ministerio</p>
          ) : (
            <div className="space-y-2">
              {membrosAtivos.map((mm: any) => (
                <div
                  key={mm._id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {mm.nome?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{mm.nome}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {mm.papel}
                        </Badge>
                        {mm.subgrupos && mm.subgrupos.length > 0 && mm.subgrupos.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                            {s}
                          </Badge>
                        ))}
                        {mm.cbcm && mm.cbcm !== "CONCLUIDO" && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${CBCM_COLORS[mm.cbcm] || ""}`}>
                            CBCM: {CBCM_LABELS[mm.cbcm] || mm.cbcm}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {can("ministerios:update") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveMembro(mm._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Editar Ministerio */}
      <MinisterioForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        isEditing
        defaultValues={{
          nome: ministerio.nome,
          descricao: ministerio.descricao || "",
          papeis: ministerio.papeis,
          subgrupos: ministerio.subgrupos || [],
        }}
      />

      {/* Dialog: Adicionar Membro */}
      <Dialog open={addMembroOpen} onOpenChange={setAddMembroOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar membro ao ministerio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Membro *</label>
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
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Papel *</label>
              <Select
                value={selectedPapel}
                onValueChange={setSelectedPapel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  {ministerio.papeis.map((p: string) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ministerio.subgrupos && ministerio.subgrupos.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Subgrupos</label>
                <div className="flex flex-wrap gap-2">
                  {ministerio.subgrupos.map((s: string) => {
                    const checked = selectedSubgrupos.includes(s);
                    return (
                      <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedSubgrupos(
                              checked
                                ? selectedSubgrupos.filter((x) => x !== s)
                                : [...selectedSubgrupos, s]
                            )
                          }
                          className="rounded border-input"
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMembroOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddMembro} disabled={!selectedMembroId || !selectedPapel}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
