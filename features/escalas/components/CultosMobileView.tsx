"use client";

import { useState } from "react";
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
import { ChevronLeft, ChevronRight, X, UserPlus, Check, Music } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MembroCombobox } from "./MembroCombobox";
import { LouvorOrdemSection } from "./LouvorOrdemSection";
import { CeiaCheckbox } from "./CeiaCheckbox";
import { BiblePassageInput } from "@/shared/bible/components/BiblePassageInput";

interface CultosMobileViewProps {
  cultos: any[];
  funcoes: { value: string; label: string; multiplo: boolean; temPassagem: boolean; temEquipe: boolean }[];
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
                await upsertEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
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
                await addEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> });
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
  const [passagem, setPassagem] = useState(assignment?.passagemBiblica || "");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const isPregacao = funcao === "PREGACAO";

  const handleSavePassagem = async () => {
    if (!assignment) {
      if (passagem.trim()) {
        try { await upsertEscala({ cultoId, funcao, passagemBiblica: passagem.trim() }); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
      }
      return;
    }
    if (passagem.trim() === (assignment.passagemBiblica || "")) return;
    try { await updatePassagem({ id: assignment._id, passagemBiblica: passagem.trim() }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) handleSavePassagem(); onOpenChange(v); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">{label}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
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
                try { await upsertEscala({ cultoId, funcao, membroId: membroId as Id<"membros"> }); }
                catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
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

          {/* Passagem bíblica */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Passagem bíblica</label>
            <BiblePassageInput
              className="text-base min-h-[44px]"
              placeholder="Ex: Sl 23; Rm 8:28"
              value={passagem}
              onChange={setPassagem}
              onBlur={handleSavePassagem}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function CultosMobileView({
  cultos,
  funcoes,
  membros,
  canEdit,
  getAssignments,
}: CultosMobileViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);

  if (cultos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base text-muted-foreground">Nenhum culto futuro cadastrado</p>
      </div>
    );
  }

  const culto = cultos[selectedIndex];
  const parsedDate = parseISO(culto.data);
  const dataFormatada = format(parsedDate, "dd/MM (EEEE)", { locale: ptBR });

  const pregacaoAssignment = getAssignments(culto, "PREGACAO")[0];

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
        <p className="text-base font-medium capitalize">{dataFormatada}</p>
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

      {/* Cards de funções */}
      <div className="space-y-2">
        {funcoes.map((f) => {
          const assignments = getAssignments(culto, f.value);
          const nomes = assignments.map((a: any) => a.membroNome).filter(Boolean);
          const passagem = assignments[0]?.passagemBiblica;
          const isLouvor = f.value === "LOUVOR";
          const musicCount = isLouvor ? (culto.louvores || []).filter((l: string) => !l.startsWith("---")).length : 0;

          return (
            <button
              key={f.value}
              onClick={() => canEdit && setOpenDrawer(f.value)}
              disabled={!canEdit}
              className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 min-h-[56px] transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-100"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">{f.label}</span>
                <span className="text-base font-medium truncate text-right">
                  {nomes.length > 0 ? nomes.join(", ") : <span className="text-muted-foreground/40">—</span>}
                </span>
              </div>
              {passagem && (
                <p className="text-sm text-muted-foreground italic mt-0.5">{passagem}</p>
              )}
              {isLouvor && musicCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {musicCount} música{musicCount > 1 ? "s" : ""}
                </p>
              )}
            </button>
          );
        })}

        {/* Santa Ceia */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 min-h-[56px] flex items-center">
          <CeiaCheckbox
            cultoId={culto._id}
            temCeia={culto.temCeia !== false}
            pregadorNome={pregacaoAssignment?.membroNome || pregacaoAssignment?.nomeCustom}
            canEdit={canEdit}
          />
        </div>
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
