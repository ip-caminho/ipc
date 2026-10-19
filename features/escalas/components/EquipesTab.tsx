"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MembroCombobox } from "@features/escalas/components/MembroCombobox";
import { useFuncoes } from "@features/escalas/hooks/useFuncoes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { X, UserPlus, Mic, Plus, ChevronRight } from "lucide-react";
import { Switch } from "@/shared/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const INSTRUMENTOS = [
  { value: "voz", label: "Voz" },
  { value: "teclado", label: "Teclado" },
  { value: "violao", label: "Violao" },
  { value: "guitarra", label: "Guitarra" },
  { value: "baixo", label: "Baixo" },
  { value: "bateria", label: "Bateria" },
] as const;

export function EquipesTab() {
  const { can } = useAuth();
  const canEdit = can("escalas:update");
  // @ts-ignore Convex TS2589
  const equipes = useQuery(api.escalas.equipes.listEquipes);
  const membros = useQuery(api.membros.queries.list, {});
  const funcoes = useFuncoes();
  const [createOpen, setCreateOpen] = useState(false);

  const funcoesEquipe = (funcoes || []).filter((f: any) => f.temEquipe);

  const activeMembros = (membros || [])
    .filter((m: any) => m.entidade?.status === "ATIVO")
    .sort((a: any, b: any) =>
      (a.entidade?.nomeCompleto || "").localeCompare(b.entidade?.nomeCompleto || "")
    );

  if (equipes === undefined || funcoes === undefined) {
    return <Skeleton className="h-96" />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {funcoesEquipe.map((funcao: any) => (
          <EquipeCard
            key={funcao.slug}
            funcao={funcao.slug}
            label={funcao.label}
            membrosEquipe={equipes[funcao.slug] || []}
            todosMembros={activeMembros}
            canEdit={canEdit}
          />
        ))}

        {canEdit && (
          <Card
            className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-center min-h-[120px]"
            onClick={() => setCreateOpen(true)}
          >
            <CardContent className="flex flex-col items-center gap-2 text-muted-foreground py-6">
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Nova equipe</span>
            </CardContent>
          </Card>
        )}
      </div>

      {canEdit && (
        <NovaEquipeDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  );
}

function NovaEquipeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useMutation(api.escalas.funcoes.create);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    setLoading(true);
    try {
      await create({
        slug: nome.toUpperCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        label: nome,
        multiplo: true,
        temEquipe: true,
        temPassagem: false,
        views: ["escala"],
      });
      toast.success(`Equipe "${nome}" criada`);
      onOpenChange(false);
      setNome("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Equipe</DialogTitle>
          <DialogDescription>
            Crie uma nova equipe para os cultos. Depois, adicione membros aqui mesmo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label>Nome da equipe</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Diaconia, Intercessao, Recepcao..."
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !nome.trim()}>
            {loading ? "Criando..." : "Criar equipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EquipeCard({
  funcao,
  label,
  membrosEquipe,
  todosMembros,
  canEdit,
}: {
  funcao: string;
  label: string;
  membrosEquipe: Array<{
    _id: string;
    membroId: string;
    ativo: boolean;
    condutor?: boolean;
    instrumentos?: string[];
    nomeCompleto: string;
    foto?: string;
  }>;
  todosMembros: any[];
  canEdit: boolean;
}) {
  // @ts-ignore Convex TS2589
  const addMembro = useMutation(api.escalas.equipes.addMembro);
  // @ts-ignore Convex TS2589
  const removeMembro = useMutation(api.escalas.equipes.removeMembro);
  // @ts-ignore Convex TS2589
  const toggleAtivo = useMutation(api.escalas.equipes.toggleAtivo);
  // @ts-ignore Convex TS2589
  const toggleCondutor = useMutation(api.escalas.equipes.toggleCondutor);
  // @ts-ignore Convex TS2589
  const updateInstrumentos = useMutation(api.escalas.equipes.updateInstrumentos);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const editing = editingId ? membrosEquipe.find((m) => m._id === editingId) : undefined;

  const equipeIds = new Set(membrosEquipe.map((m) => m.membroId));
  const available = todosMembros.filter((m: any) => !equipeIds.has(m._id));

  const handleAdd = async (membroId: string) => {
    try {
      await addMembro({ funcao, membroId: membroId as Id<"membros"> });
      setAdding(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMembro({ id: id as Id<"equipeMembros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleAtivo({ id: id as Id<"equipeMembros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleToggleCondutor = async (id: string) => {
    try {
      await toggleCondutor({ id: id as Id<"equipeMembros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const isLouvor = funcao === "LOUVOR";

  const handleToggleInstrumento = async (id: string, instrumento: string, current: string[]) => {
    const next = current.includes(instrumento)
      ? current.filter((i) => i !== instrumento)
      : [...current, instrumento];
    try {
      await updateInstrumentos({ id: id as Id<"equipeMembros">, instrumentos: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {membrosEquipe.filter((m) => m.ativo).length} ativos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {membrosEquipe.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum membro na equipe</p>
        )}
        {membrosEquipe.map((m) => (
          <div key={m._id}>
          {/* Mobile: leitura; toque abre o Drawer de edicao */}
          {(() => {
            const rowContent = (
              <>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {m.nomeCompleto.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.nomeCompleto}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      m.ativo ? "ativo" : "inativo",
                      isLouvor && (m.condutor ? "condutor" : "acompanha"),
                      isLouvor &&
                        INSTRUMENTOS.filter((i) => (m.instrumentos || []).includes(i.value))
                          .map((i) => i.label)
                          .join(", "),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </>
            );
            return canEdit ? (
              <button
                type="button"
                onClick={() => setEditingId(m._id)}
                className="flex w-full min-h-14 items-center gap-3 text-left active:bg-muted/50 md:hidden"
              >
                {rowContent}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            ) : (
              <div className="flex min-h-14 items-center gap-3 md:hidden">{rowContent}</div>
            );
          })()}
          <div
            className="hidden items-center gap-2 py-1 md:flex"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {m.nomeCompleto.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm min-w-0 flex-1 truncate">{m.nomeCompleto}</span>
            <div className="md:contents">
            {isLouvor && (
              <div className="flex flex-wrap gap-0.5">
                {INSTRUMENTOS.map((inst) => {
                  const active = (m.instrumentos || []).includes(inst.value);
                  return canEdit ? (
                    <Badge
                      key={inst.value}
                      variant={active ? "default" : "outline"}
                      className="text-[10px] cursor-pointer"
                      onClick={() => handleToggleInstrumento(m._id, inst.value, m.instrumentos || [])}
                    >
                      {inst.label}
                    </Badge>
                  ) : active ? (
                    <Badge key={inst.value} variant="secondary" className="text-[10px]">
                      {inst.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            {isLouvor && (
              <Badge
                variant={m.condutor ? "default" : "outline"}
                className={`text-[10px] ${canEdit ? "cursor-pointer" : ""} ${m.condutor ? "bg-yellow-600 hover:bg-yellow-700" : ""}`}
                onClick={canEdit ? () => handleToggleCondutor(m._id) : undefined}
              >
                <Mic className="h-2.5 w-2.5 mr-0.5" />
                {m.condutor ? "condutor" : "acompanha"}
              </Badge>
            )}
            {canEdit ? (
              <Badge
                variant={m.ativo ? "default" : "outline"}
                className="text-[10px] cursor-pointer"
                onClick={() => handleToggle(m._id)}
              >
                {m.ativo ? "ativo" : "inativo"}
              </Badge>
            ) : (
              <Badge variant={m.ativo ? "default" : "outline"} className="text-[10px]">
                {m.ativo ? "ativo" : "inativo"}
              </Badge>
            )}
            </div>
            {canEdit && (
              <button
                onClick={() => setRemoving({ id: m._id, nome: m.nomeCompleto })}
                aria-label="Remover da equipe"
                className="flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          </div>
        ))}

        {canEdit && (
          adding ? (
            <div className="pt-1">
              <MembroCombobox
                membros={available}
                onSelect={handleAdd}
                placeholder="Selecionar membro..."
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs mt-1"
                onClick={() => setAdding(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-11 md:h-8 text-sm md:text-xs"
              onClick={() => setAdding(true)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Adicionar membro
            </Button>
          )
        )}
      </CardContent>

      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditingId(null)}>
        <DrawerContent className="max-h-[92dvh]">
          {editing && (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle>{editing.nomeCompleto}</DrawerTitle>
                <DrawerDescription>{label}</DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-safe">
                <div className="rounded-md border divide-y">
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm">
                    Ativo na equipe
                    <Switch checked={editing.ativo} onCheckedChange={() => handleToggle(editing._id)} />
                  </label>
                  {isLouvor && (
                    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm">
                      Condutor
                      <Switch
                        checked={!!editing.condutor}
                        onCheckedChange={() => handleToggleCondutor(editing._id)}
                      />
                    </label>
                  )}
                </div>
                {isLouvor && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Instrumentos</p>
                    <div className="rounded-md border divide-y">
                      {INSTRUMENTOS.map((inst) => (
                        <label
                          key={inst.value}
                          className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm"
                        >
                          {inst.label}
                          <Switch
                            checked={(editing.instrumentos || []).includes(inst.value)}
                            onCheckedChange={() =>
                              handleToggleInstrumento(editing._id, inst.value, editing.instrumentos || [])
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="h-11 w-full text-destructive"
                  onClick={() => setRemoving({ id: editing._id, nome: editing.nomeCompleto })}
                >
                  Remover da equipe
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {removing?.nome} da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele deixa de aparecer nas escalas de {label}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) {
                  handleRemove(removing.id);
                  if (removing.id === editingId) setEditingId(null);
                }
                setRemoving(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
