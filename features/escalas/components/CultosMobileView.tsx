"use client";

import { Fragment, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CommandItem } from "@/shared/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronLeft, ChevronRight, X, UserPlus, Check, Music } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MembroCombobox } from "./MembroCombobox";
import { LouvorOrdemSection } from "./LouvorOrdemSection";
import { CeiaCheckbox } from "./CeiaCheckbox";
import { BiblePassagePicker } from "@/shared/bible/components/BiblePassagePicker";
import { BibleVersePreview } from "@/shared/bible/components/BibleVersePreview";
import { useBibleLookup } from "@/shared/bible/hooks/useBibleLookup";
import { cn } from "@/shared/lib/utils/cn";

type FuncaoConfig = { value: string; label: string; multiplo: boolean; temPassagem: boolean; temEquipe: boolean };

interface CultosMobileViewProps {
  cultos: any[];
  funcoes: FuncaoConfig[];
  grupos?: { titulo: string; funcoes: FuncaoConfig[] }[];
  membros: any[];
  canEdit: boolean;
  getAssignments: (culto: any, funcao: string) => any[];
}

// Drawer para edição de função simples (1 membro)
function SingleDrawer({
  open,
  onOpenChange,
  label,
  cultoId,
  funcao,
  assignment,
  membros,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  cultoId: Id<"cultos">;
  funcao: string;
  assignment?: any;
  membros: any[];
}) {
  // @ts-ignore Convex TS2589
  const upsertEscala = useMutation(api.escalas.mutations.upsertEscala);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">{label}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-3">
          <MembroCombobox
            membros={membros}
            value={assignment?.membroId}
            displayName={assignment?.membroNome}
            onSelect={async (membroId) => {
              try {
                const result = await upsertEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
                if (result?.outrasFuncoes?.length) {
                  toast.warning(`Membro também escalado como ${result.outrasFuncoes.join(", ")}`);
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
          >
            {assignment && (
              <CommandItem
                onSelect={async () => {
                  try {
                    await removeEscala({ id: assignment._id });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro");
                  }
                }}
                className="text-destructive"
              >
                <X className="h-3.5 w-3.5 mr-2" />
                Remover
              </CommandItem>
            )}
          </MembroCombobox>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Drawer para edição de função com múltiplos membros
function MultiDrawer({
  open,
  onOpenChange,
  label,
  cultoId,
  funcao,
  assignments,
  membros,
  louvorProps,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  cultoId: Id<"cultos">;
  funcao: string;
  assignments: any[];
  membros: any[];
  louvorProps?: { louvores: string[]; temCeia: boolean; canEdit: boolean; dataLabel: string };
}) {
  // @ts-ignore Convex TS2589
  const addEscala = useMutation(api.escalas.mutations.addEscala);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);

  const assignedIds = new Set(assignments.map((a: any) => a.membroId).filter(Boolean));
  const available = membros.filter((m: any) => !assignedIds.has(m._id));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">{label}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
          {/* Membros atuais */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a._id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 min-h-[44px]">
                  <span className="text-sm">{a.membroNome}</span>
                  <button
                    onClick={async () => {
                      try { await removeEscala({ id: a._id }); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar */}
          <MembroCombobox
            membros={available}
            onSelect={async (membroId) => {
              try {
                const result = await addEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
                if (result?.outrasFuncoes?.length) {
                  toast.warning(`Membro também escalado como ${result.outrasFuncoes.join(", ")}`);
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              }
            }}
            placeholder="+ Adicionar membro"
          />

          {/* Músicas (apenas para Louvor) */}
          {louvorProps && (
            <div className="pt-2 border-t">
              <LouvorOrdemSection
                cultoId={cultoId}
                louvores={louvorProps.louvores}
                temCeia={louvorProps.temCeia}
                canEdit={louvorProps.canEdit}
                dataLabel={louvorProps.dataLabel}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Helpers para passagens separadas por ";"
function parsePassagens(raw: string): string[] {
  return raw.split(";").map((s) => s.trim()).filter(Boolean);
}
function joinPassagens(list: string[]): string {
  return list.join("; ");
}

// Drawer para edição de função com passagem bíblica
function PassagemDrawer({
  open,
  onOpenChange,
  label,
  cultoId,
  funcao,
  assignment,
  membros,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  cultoId: Id<"cultos">;
  funcao: string;
  assignment?: any;
  membros: any[];
}) {
  // @ts-ignore Convex TS2589
  const upsertEscala = useMutation(api.escalas.mutations.upsertEscala);
  const updatePassagem = useMutation(api.escalas.mutations.updatePassagem);
  const removeEscala = useMutation(api.escalas.mutations.removeEscala);
  const [passagens, setPassagens] = useState<string[]>(() =>
    parsePassagens(assignment?.passagemBiblica || "")
  );
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const isPregacao = funcao === "PREGACAO";

  const savePassagens = async (list: string[]) => {
    const joined = joinPassagens(list);
    if (!assignment) {
      if (joined) {
        try { await upsertEscala({ cultoId, funcao, passagemBiblica: joined }); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
      }
      return;
    }
    if (joined === (assignment.passagemBiblica || "")) return;
    try { await updatePassagem({ id: assignment._id, passagemBiblica: joined }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const addPassagem = (ref: string) => {
    const next = [...passagens, ref];
    setPassagens(next);
    setShowPicker(false);
    savePassagens(next);
  };

  const removePassagem = (index: number) => {
    const next = passagens.filter((_, i) => i !== index);
    setPassagens(next);
    savePassagens(next);
  };

  const movePassagem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= passagens.length) return;
    const next = [...passagens];
    [next[index], next[target]] = [next[target], next[index]];
    setPassagens(next);
    savePassagens(next);
  };

  const previewInput = passagens.join("; ");
  const preview = useBibleLookup(showPreview ? previewInput : "");

  if (showPreview) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-base">Conferir passagens</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 flex flex-col h-[70vh]">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <BibleVersePreview
                loading={preview.loading}
                results={preview.results}
                error={preview.error}
                maxHeight="none"
              />
            </div>
            <Button
              variant="outline"
              className="w-full min-h-[48px] text-sm mt-3 shrink-0"
              onClick={() => setShowPreview(false)}
            >
              Voltar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">{label}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-5">
          {/* Responsável */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-primary/70">Responsável</label>
            {showCustom ? (
              <div className="flex items-center gap-2">
                <Input
                  className="text-base min-h-[44px]"
                  placeholder="Nome do pregador"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                />
                <Button
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={async () => {
                    if (!customName.trim()) return;
                    try {
                      await upsertEscala({ cultoId, funcao, nomeCustom: customName.trim() });
                      setCustomName("");
                      setShowCustom(false);
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => setShowCustom(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <MembroCombobox
                membros={membros}
                value={assignment?.membroId}
                displayName={assignment?.membroNome}
                onSelect={async (membroId) => {
                  try {
                    const result = await upsertEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
                    if (result?.outrasFuncoes?.length) {
                      toast.warning(`Membro também escalado como ${result.outrasFuncoes.join(", ")}`);
                    }
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                }}
              >
                {assignment && (
                  <CommandItem
                    onSelect={async () => {
                      try { await removeEscala({ id: assignment._id }); }
                      catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                    }}
                    className="text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-2" />
                    Remover
                  </CommandItem>
                )}
                {isPregacao && (
                  <CommandItem onSelect={() => setShowCustom(true)} className="font-medium">
                    <UserPlus className="h-3.5 w-3.5 mr-2" />
                    Pregador externo
                  </CommandItem>
                )}
              </MembroCombobox>
            )}
          </div>

          {/* Passagens */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-primary/70">Passagens</label>
          {passagens.length > 0 && (
            <div className="space-y-1">
              {passagens.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 py-1.5"
                >
                  <span className="flex-1 text-sm">{p}</span>
                  <button
                    type="button"
                    onClick={() => movePassagem(i, -1)}
                    disabled={i === 0}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePassagem(i, 1)}
                    disabled={i === passagens.length - 1}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePassagem(i)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

            {/* Ações */}
            {showPicker ? (
              <BiblePassagePicker onSelect={addPassagem} />
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={() => setShowPicker(true)}
                >
                  + Adicionar passagem
                </Button>
                {passagens.length > 0 && (
                  <Button
                    variant="outline"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => setShowPreview(true)}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function CultosMobileView({
  cultos,
  funcoes,
  grupos,
  membros,
  canEdit,
  getAssignments,
}: CultosMobileViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const [collapsedGrupos, setCollapsedGrupos] = useState<Set<string>>(new Set(["Equipe"]));

  if (cultos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base text-muted-foreground">Nenhum culto futuro cadastrado</p>
      </div>
    );
  }

  const culto = cultos[selectedIndex];
  const parsedDate = parseISO(culto.data);
  const dataFormatada = format(parsedDate, "dd 'de' MMMM", { locale: ptBR });
  const isProximo = selectedIndex === 0;

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          disabled={selectedIndex === 0}
          onClick={() => setSelectedIndex((i) => i - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-base font-medium capitalize">{dataFormatada}</p>
          {isProximo && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Próximo culto</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          disabled={selectedIndex === cultos.length - 1}
          onClick={() => setSelectedIndex((i) => i + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Funções agrupadas */}
      <div className="space-y-4">
        {(grupos || [{ titulo: "", funcoes }]).map((grupo) => {
          const isCollapsible = grupo.titulo === "Equipe";
          const isCollapsed = isCollapsible && collapsedGrupos.has(grupo.titulo);

          const toggleCollapse = () => {
            setCollapsedGrupos((prev) => {
              const next = new Set(prev);
              if (next.has(grupo.titulo)) next.delete(grupo.titulo);
              else next.add(grupo.titulo);
              return next;
            });
          };

          return (
          <div key={grupo.titulo}>
            {grupo.titulo && (
              isCollapsible ? (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest min-h-[44px]"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isCollapsed && "-rotate-90")} />
                  {grupo.titulo}
                </button>
              ) : (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{grupo.titulo}</h3>
              )
            )}
            {!isCollapsed && (
              <div className="divide-y divide-border">
                {grupo.funcoes.map((f) => {
                  const assignments = getAssignments(culto, f.value);
                  const nomes = assignments.map((a: any) => a.membroNome).filter(Boolean);
                  const passagem = assignments[0]?.passagemBiblica;
                  const isLouvor = f.value === "LOUVOR";
                  const musicCount = isLouvor ? (culto.louvores || []).filter((l: string) => !l.startsWith("---")).length : 0;

                  return (
                    <Fragment key={f.value}>
                      {/* Santa Ceia antes de Avisos */}
                      {f.value === "AVISOS" && (
                        <div className="flex items-center py-3 min-h-[44px]">
                          <CeiaCheckbox
                            cultoId={culto._id}
                            temCeia={culto.temCeia !== false}
                            canEdit={canEdit}
                          />
                        </div>
                      )}
                      <button
                        onClick={() => canEdit && setOpenDrawer(f.value)}
                        disabled={!canEdit}
                        className={cn(
                          "w-full text-left py-3 px-3 -mx-3 min-h-[44px] transition-colors active:bg-muted/50 disabled:opacity-100 rounded-lg",
                          (f.value === "ABERTURA" || f.value === "CONFISSAO" || f.value === "PREGACAO") && "bg-slate-50/80 dark:bg-slate-900/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">{f.label}</span>
                          <span className="text-sm font-medium truncate text-right">
                            {nomes.length > 0 ? nomes.join(", ") : <span className="text-muted-foreground/40">—</span>}
                          </span>
                        </div>
                        {passagem && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">{passagem}</p>
                        )}
                        {isLouvor && musicCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Music className="h-3 w-3" />
                            {musicCount} música{musicCount > 1 ? "s" : ""}
                          </p>
                        )}
                      </button>
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Drawers de edição */}
      {funcoes.map((f) => {
        const assignments = getAssignments(culto, f.value);
        const isLouvor = f.value === "LOUVOR";

        if (f.temPassagem) {
          return (
            <PassagemDrawer
              key={f.value}
              open={openDrawer === f.value}
              onOpenChange={(v) => setOpenDrawer(v ? f.value : null)}
              label={f.label}
              cultoId={culto._id}
              funcao={f.value}
              assignment={assignments[0]}
              membros={membros}
            />
          );
        }

        if (f.multiplo || isLouvor) {
          return (
            <MultiDrawer
              key={f.value}
              open={openDrawer === f.value}
              onOpenChange={(v) => setOpenDrawer(v ? f.value : null)}
              label={f.label}
              cultoId={culto._id}
              funcao={f.value}
              assignments={assignments}
              membros={membros}
              louvorProps={isLouvor ? {
                louvores: culto.louvores || [],
                temCeia: culto.temCeia !== false,
                canEdit,
                dataLabel: format(parseISO(culto.data), "dd/MM", { locale: ptBR }),
              } : undefined}
            />
          );
        }

        return (
          <SingleDrawer
            key={f.value}
            open={openDrawer === f.value}
            onOpenChange={(v) => setOpenDrawer(v ? f.value : null)}
            label={f.label}
            cultoId={culto._id}
            funcao={f.value}
            assignment={assignments[0]}
            membros={membros}
          />
        );
      })}
    </div>
  );
}
