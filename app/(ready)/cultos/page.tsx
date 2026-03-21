"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CommandItem } from "@/shared/components/ui/command";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Plus, Trash2, X, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { useFuncoes } from "@features/escalas/hooks/useFuncoes";
import { AvisosSection } from "@features/avisos/components/AvisosSection";
import { MembroCombobox } from "@features/escalas/components/MembroCombobox";
import { cn } from "@/shared/lib/utils/cn";
import type { Id } from "@/convex/_generated/dataModel";

type CultoViewMode = "escala" | "liturgia" | "avisos";

function SingleCell({
  cultoId,
  funcao,
  assignment,
  membros,
}: {
  cultoId: Id<"cultos">;
  funcao: string;
  assignment?: { _id: Id<"cultoEscalas">; membroId?: string; membroNome: string; nomeCustom?: string };
  membros: any[];
}) {
  // @ts-ignore Convex TS2589
  const upsertEscala = useMutation(api.escalas.mutations.upsertEscala);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);

  const handleSelect = async (membroId: string) => {
    try {
      await upsertEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemove = async () => {
    if (!assignment) return;
    try {
      await removeEscala({ id: assignment._id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <MembroCombobox
      membros={membros}
      value={assignment?.membroId}
      displayName={assignment?.membroNome}
      onSelect={handleSelect}
    >
      {assignment && (
        <CommandItem onSelect={handleRemove} className="text-destructive text-xs">
          <X className="h-3.5 w-3.5 mr-2" />
          Remover
        </CommandItem>
      )}
    </MembroCombobox>
  );
}

function PregacaoCell({
  cultoId,
  assignment,
  membros,
}: {
  cultoId: Id<"cultos">;
  assignment?: { _id: Id<"cultoEscalas">; membroId?: string; membroNome: string; nomeCustom?: string };
  membros: any[];
}) {
  // @ts-ignore Convex TS2589
  const upsertEscala = useMutation(api.escalas.mutations.upsertEscala);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const handleSelect = async (membroId: string) => {
    try {
      await upsertEscala({ cultoId, funcao: "PREGACAO", membroId: membroId as Id<"membros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemove = async () => {
    if (!assignment) return;
    try {
      await removeEscala({ id: assignment._id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleCustomSubmit = async () => {
    if (!customName.trim()) return;
    try {
      await upsertEscala({ cultoId, funcao: "PREGACAO", nomeCustom: customName.trim() });
      setCustomName("");
      setShowCustom(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (showCustom) {
    return (
      <div className="flex items-center gap-1">
        <Input
          className="h-7 text-xs px-1.5"
          placeholder="Nome do pregador"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
          autoFocus
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCustomSubmit}>
          <Plus className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setShowCustom(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <MembroCombobox
      membros={membros}
      value={assignment?.membroId}
      displayName={assignment?.membroNome}
      onSelect={handleSelect}
    >
      {assignment && (
        <CommandItem onSelect={handleRemove} className="text-destructive text-xs">
          <X className="h-3.5 w-3.5 mr-2" />
          Remover
        </CommandItem>
      )}
      <CommandItem onSelect={() => setShowCustom(true)} className="text-xs font-medium">
        <UserPlus className="h-3.5 w-3.5 mr-2" />
        Pregador externo
      </CommandItem>
    </MembroCombobox>
  );
}

function MultiCell({
  cultoId,
  funcao,
  assignments,
  membros,
}: {
  cultoId: Id<"cultos">;
  funcao: string;
  assignments: { _id: Id<"cultoEscalas">; membroId?: string; membroNome: string }[];
  membros: any[];
}) {
  // @ts-ignore Convex TS2589
  const addEscala = useMutation(api.escalas.mutations.addEscala);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);

  const assignedIds = new Set(assignments.map((a) => a.membroId).filter(Boolean));
  const available = membros.filter((m: any) => !assignedIds.has(m._id));

  const handleAdd = async (membroId: string) => {
    try {
      await addEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemove = async (escalaId: Id<"cultoEscalas">) => {
    try {
      await removeEscala({ id: escalaId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-1 py-0.5">
      {assignments.map((a) => (
        <div key={a._id} className="flex items-center gap-1 text-xs px-1.5">
          <span className="truncate">{a.membroNome}</span>
          <button
            onClick={() => handleRemove(a._id)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <MembroCombobox
        membros={available}
        onSelect={handleAdd}
        placeholder={assignments.length > 0 ? "+ Adicionar" : "—"}
      />
    </div>
  );
}

function PassagemCell({
  cultoId,
  funcao,
  assignment,
  membros,
}: {
  cultoId: Id<"cultos">;
  funcao: string;
  assignment?: { _id: Id<"cultoEscalas">; membroId?: string; membroNome: string; nomeCustom?: string; passagemBiblica?: string };
  membros: any[];
  canEdit: boolean;
}) {
  // @ts-ignore Convex TS2589
  const upsertEscala = useMutation(api.escalas.mutations.upsertEscala);
  const updatePassagem = useMutation(api.escalas.mutations.updatePassagem);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);
  const [editingPassagem, setEditingPassagem] = useState(false);
  const [passagem, setPassagem] = useState(assignment?.passagemBiblica || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectMembro = async (membroId: string) => {
    try {
      await upsertEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleRemove = async () => {
    if (!assignment) return;
    try {
      await removeEscala({ id: assignment._id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleSavePassagem = async () => {
    setEditingPassagem(false);
    if (!assignment) {
      if (passagem.trim()) {
        try {
          await upsertEscala({ cultoId, funcao, passagemBiblica: passagem.trim() });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro");
        }
      }
      return;
    }
    if (passagem.trim() === (assignment.passagemBiblica || "")) return;
    try {
      await updatePassagem({ id: assignment._id, passagemBiblica: passagem.trim() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const isPregacao = funcao === "PREGACAO";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <MembroCombobox
          membros={membros}
          value={assignment?.membroId}
          displayName={assignment?.membroNome}
          onSelect={handleSelectMembro}
          triggerClassName="h-6 text-[11px]"
        >
          {assignment && (
            <CommandItem onSelect={handleRemove} className="text-destructive text-xs">
              <X className="h-3.5 w-3.5 mr-2" />
              Remover
            </CommandItem>
          )}
          {isPregacao && (
            <CommandItem className="text-xs font-medium">
              <UserPlus className="h-3.5 w-3.5 mr-2" />
              Pregador externo
            </CommandItem>
          )}
        </MembroCombobox>
      </div>
      {editingPassagem ? (
        <Input
          ref={inputRef}
          className="h-6 text-[11px] px-1.5 italic"
          placeholder="Ex: Salmo 23:1-6"
          value={passagem}
          onChange={(e) => setPassagem(e.target.value)}
          onBlur={handleSavePassagem}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSavePassagem();
            if (e.key === "Escape") { setEditingPassagem(false); setPassagem(assignment?.passagemBiblica || ""); }
          }}
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setPassagem(assignment?.passagemBiblica || ""); setEditingPassagem(true); }}
          className="text-[11px] px-1.5 h-6 w-full text-left rounded hover:bg-accent/50 truncate italic text-muted-foreground"
        >
          {assignment?.passagemBiblica || "Passagem..."}
        </button>
      )}
    </div>
  );
}

function LouvoresCell({
  cultoId,
  louvores,
}: {
  cultoId: Id<"cultos">;
  louvores: string[];
}) {
  const updateLouvores = useMutation(api.escalas.mutations.updateLouvores);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const handleStartEdit = () => {
    setText(louvores.join("\n"));
    setEditing(true);
  };

  const handleSave = async () => {
    setEditing(false);
    const newLouvores = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const oldStr = louvores.join(",");
    const newStr = newLouvores.join(",");
    if (oldStr === newStr) return;
    try {
      await updateLouvores({ cultoId, louvores: newLouvores });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  if (editing) {
    return (
      <textarea
        className="w-full text-[11px] px-1.5 py-1 rounded border bg-background resize-none min-h-[60px] italic"
        placeholder={"Um louvor por linha...\nEx:\nSanto, Santo, Santo\nGrande é o Senhor"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setEditing(false); }
        }}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className="text-[11px] px-1.5 py-0.5 w-full text-left rounded hover:bg-accent/50 italic text-muted-foreground min-h-[28px]"
    >
      {louvores.length > 0 ? (
        <div className="space-y-0.5">
          {louvores.map((l, i) => (
            <div key={i} className="text-foreground truncate">{l}</div>
          ))}
        </div>
      ) : (
        "Louvores..."
      )}
    </button>
  );
}

function ReadonlyCell({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-xs px-1.5 text-muted-foreground">—</span>;
  return (
    <div className="text-xs px-1.5 space-y-0.5">
      {names.map((n, i) => (
        <div key={i}>{n}</div>
      ))}
    </div>
  );
}

function ReadonlyPassagemCell({ assignment }: { assignment?: { membroNome: string; passagemBiblica?: string } }) {
  return (
    <div className="text-xs px-1.5 space-y-0.5">
      <div>{assignment?.membroNome || <span className="text-muted-foreground">—</span>}</div>
      {assignment?.passagemBiblica && (
        <div className="text-[11px] italic text-muted-foreground">{assignment.passagemBiblica}</div>
      )}
    </div>
  );
}

function ReadonlyLouvoresCell({ louvores }: { louvores: string[] }) {
  if (louvores.length === 0) return <span className="text-xs px-1.5 text-muted-foreground">—</span>;
  return (
    <div className="text-[11px] px-1.5 space-y-0.5 italic">
      {louvores.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

export default function CultosPage() {
  const { can } = useAuth();
  const canEdit = can("escalas:update");
  // @ts-ignore Convex TS2589
  const cultos = useQuery(api.escalas.queries.listCultos, {});
  const membros = useQuery(api.membros.queries.list, {});
  // @ts-ignore Convex TS2589
  const createCulto = useMutation(api.escalas.mutations.createCulto);
  const deleteCulto = useMutation(api.escalas.mutations.deleteCulto);
  const allFuncoes = useFuncoes();

  const [novaData, setNovaData] = useState("");
  const [viewMode, setViewMode] = useState<CultoViewMode>("escala");
  const [showAvisoForm, setShowAvisoForm] = useState(false);

  const activeMembros = (membros || [])
    .filter((m: any) => m.entidade?.status === "ATIVO")
    .sort((a: any, b: any) => (a.entidade?.nomeCompleto || "").localeCompare(b.entidade?.nomeCompleto || ""));

  const sortedCultos = [...(cultos || [])].sort((a, b) => a.data.localeCompare(b.data));

  const visibleFuncoes = (allFuncoes || []).filter((f: any) =>
    f.views.includes(viewMode)
  ).map((f: any) => ({ value: f.slug, label: f.label, multiplo: f.multiplo, views: f.views, temPassagem: f.temPassagem }));

  const handleAddCulto = async () => {
    if (!novaData) return;
    try {
      await createCulto({ data: novaData, tipo: "DOMINICAL" as any });
      setNovaData("");
      toast.success("Culto adicionado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  };

  const handleDeleteCulto = async (id: Id<"cultos">) => {
    if (!confirm("Excluir este culto e toda sua escala?")) return;
    try {
      await deleteCulto({ id });
      toast.success("Culto excluido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const getAssignments = (culto: any, funcao: string) => {
    return (culto.escalas || []).filter((e: any) => e.funcao === funcao);
  };

  if (cultos === undefined) {
    return (
      <ModuloGuard modulo="escalas">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Cultos</h1>
        <Skeleton className="h-96" />
      </div>
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="escalas">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Cultos</h1>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as CultoViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="escala" className="text-xs px-3 h-6">Escala</TabsTrigger>
              <TabsTrigger value="liturgia" className="text-xs px-3 h-6">Liturgia</TabsTrigger>
              <TabsTrigger value="avisos" className="text-xs px-3 h-6">Avisos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {viewMode === "avisos" ? (
          can("escalas:create") && !showAvisoForm && (
            <Button size="sm" variant="outline" onClick={() => setShowAvisoForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo aviso
            </Button>
          )
        ) : (
          can("escalas:create") && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="w-40 h-9"
              />
              <Button size="sm" onClick={handleAddCulto} disabled={!novaData}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          )
        )}
      </div>

      {viewMode === "avisos" ? (
        <AvisosSection showForm={showAvisoForm} setShowForm={setShowAvisoForm} />
      ) : (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium sticky left-0 bg-muted/50 min-w-[100px]">Data</th>
              {visibleFuncoes.map((f) => (
                <th key={f.value} className="text-left p-2 font-medium min-w-[130px] whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              {can("escalas:delete") && <th className="w-10 p-2" />}
            </tr>
          </thead>
          <tbody>
            {sortedCultos.length === 0 ? (
              <tr>
                <td colSpan={visibleFuncoes.length + (can("escalas:delete") ? 2 : 1)} className="text-center py-8 text-muted-foreground">
                  Nenhum culto cadastrado
                </td>
              </tr>
            ) : (
              sortedCultos.map((culto) => {
                const parsedDate = parseISO(culto.data);
                const isDomingo = parsedDate.getDay() === 0;
                const dataFormatada = format(parsedDate, "dd/MM (EEE)", { locale: ptBR });
                return (
                  <tr key={culto._id} className={cn("border-b hover:bg-accent/30", !isDomingo && "opacity-50")}>
                    <td className="p-2 font-medium sticky left-0 bg-background capitalize whitespace-nowrap text-xs">
                      {dataFormatada}
                    </td>
                    {visibleFuncoes.map((f) => {
                      const assignments = getAssignments(culto, f.value);

                      if (viewMode === "liturgia") {
                        if (f.value === "LOUVOR") {
                          return (
                            <td key={f.value} className="p-1 align-top">
                              {canEdit ? (
                                <LouvoresCell cultoId={culto._id} louvores={culto.louvores || []} />
                              ) : (
                                <ReadonlyLouvoresCell louvores={culto.louvores || []} />
                              )}
                            </td>
                          );
                        }
                        return (
                          <td key={f.value} className="p-1 align-top">
                            {canEdit ? (
                              <PassagemCell
                                cultoId={culto._id}
                                funcao={f.value}
                                assignment={assignments[0]}
                                membros={activeMembros}
                                canEdit={canEdit}
                              />
                            ) : (
                              <ReadonlyPassagemCell assignment={assignments[0]} />
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={f.value} className="p-1 align-top">
                          {canEdit ? (
                            f.value === "PREGACAO" ? (
                              <PregacaoCell
                                cultoId={culto._id}
                                assignment={assignments[0]}
                                membros={activeMembros}
                              />
                            ) : f.multiplo ? (
                              <MultiCell
                                cultoId={culto._id}
                                funcao={f.value}
                                assignments={assignments}
                                membros={activeMembros}
                              />
                            ) : (
                              <SingleCell
                                cultoId={culto._id}
                                funcao={f.value}
                                assignment={assignments[0]}
                                membros={activeMembros}
                              />
                            )
                          ) : (
                            <ReadonlyCell names={assignments.map((a: any) => a.membroNome)} />
                          )}
                        </td>
                      );
                    })}
                    {can("escalas:delete") && (
                      <td className="p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteCulto(culto._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
    </ModuloGuard>
  );
}
