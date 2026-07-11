"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { DatePickerBR } from "@/shared/components/ui/date-picker-br";
import { ResponsiveSelect } from "@/shared/components/ui/responsive-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import {
  TURMA_OPTIONS,
  TURMA_COLORS,
  PAPEL_VOLUNTARIO_OPTIONS,
} from "../lib/constants";
import type { DiaEscala, PapelEscala } from "../lib/escala";

export interface VoluntarioParaEscala {
  membroId: string;
  nome: string;
  foto: string | null;
  papelEdu: PapelEscala;
  turmasHabilitadas: string[];
  cacValidade: string | null;
}

type SlotMembro = { membroId: string; papel: PapelEscala };

interface EscalaDiaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ministerioId: Id<"ministerios">;
  voluntarios: VoluntarioParaEscala[];
  /** Dia existente para editar (pré-preenche as turmas). */
  initialDia?: DiaEscala | null;
  /** Data inicial ao criar do zero. */
  initialDate?: string;
}

export function EscalaDiaForm({
  open,
  onOpenChange,
  ministerioId,
  voluntarios,
  initialDia,
  initialDate,
}: EscalaDiaFormProps) {
  const upsert = useMutation(api.educacional.mutations.upsertEscalaDia);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState("");
  const [turmas, setTurmas] = useState<Record<string, SlotMembro[]>>({});

  const editando = !!initialDia;

  // Pré-preenche ao abrir.
  useEffect(() => {
    if (!open) return;
    if (initialDia) {
      setData(initialDia.data);
      const inicial: Record<string, SlotMembro[]> = {};
      for (const t of initialDia.turmas) {
        inicial[t.subgrupo] = t.membros.map((m) => ({
          membroId: m.membroId,
          papel: m.papel,
        }));
      }
      setTurmas(inicial);
    } else {
      setData(initialDate ?? "");
      setTurmas({});
    }
  }, [open, initialDia, initialDate]);

  const cacPorMembro = useMemo(
    () => new Map(voluntarios.map((v) => [v.membroId, v.cacValidade])),
    [voluntarios]
  );

  function setSlots(subgrupo: string, slots: SlotMembro[]) {
    setTurmas((prev) => ({ ...prev, [subgrupo]: slots }));
  }

  function addSlot(subgrupo: string) {
    setSlots(subgrupo, [
      ...(turmas[subgrupo] ?? []),
      { membroId: "", papel: "PROFESSOR" },
    ]);
  }

  function removeSlot(subgrupo: string, index: number) {
    setSlots(
      subgrupo,
      (turmas[subgrupo] ?? []).filter((_, i) => i !== index)
    );
  }

  function selecionarMembro(subgrupo: string, index: number, membroId: string) {
    const vol = voluntarios.find((v) => v.membroId === membroId);
    setSlots(
      subgrupo,
      (turmas[subgrupo] ?? []).map((s, i) =>
        i === index
          ? { membroId, papel: vol?.papelEdu ?? s.papel }
          : s
      )
    );
  }

  function definirPapel(subgrupo: string, index: number, papel: PapelEscala) {
    setSlots(
      subgrupo,
      (turmas[subgrupo] ?? []).map((s, i) =>
        i === index ? { ...s, papel } : s
      )
    );
  }

  async function handleSubmit() {
    if (!data) {
      toast.error("Informe a data");
      return;
    }
    setLoading(true);
    try {
      const payload = TURMA_OPTIONS.map((t) => ({
        subgrupo: t.value,
        membros: (turmas[t.value] ?? [])
          .filter((s) => s.membroId)
          .map((s) => ({
            membroId: s.membroId as Id<"membros">,
            papel: s.papel,
          })),
      }));
      await upsert({ ministerioId, data, turmas: payload });
      toast.success(editando ? "Escala atualizada" : "Escala salva");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.data ?? e?.message ?? "Erro ao salvar escala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editando ? "Editar escala do domingo" : "Nova escala do domingo"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          <div className="space-y-1">
            <Label>Data *</Label>
            <DatePickerBR value={data} onChange={setData} disabled={editando} />
          </div>

          <div className="space-y-4">
            {TURMA_OPTIONS.map((turma) => {
              const slots = turmas[turma.value] ?? [];
              const elegiveis = voluntarios.filter((v) =>
                v.turmasHabilitadas.includes(turma.value)
              );
              const semProfessor = !slots.some(
                (s) => s.membroId && s.papel === "PROFESSOR"
              );
              return (
                <div
                  key={turma.value}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={TURMA_COLORS[turma.value] || ""}
                      >
                        {turma.label}
                      </Badge>
                      {semProfessor && (
                        <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                          <TriangleAlert className="h-3 w-3" />
                          sem professor
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => addSlot(turma.value)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Pessoa
                    </Button>
                  </div>

                  {slots.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Ninguém escalado nesta turma.
                    </p>
                  )}

                  {slots.map((slot, index) => {
                    const cac = cacPorMembro.get(slot.membroId);
                    const cacVencido = !!cac && !!data && cac < data;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <ResponsiveSelect
                              options={elegiveis.map((v) => ({
                                value: v.membroId,
                                label: v.nome,
                              }))}
                              value={slot.membroId}
                              onValueChange={(val) =>
                                selecionarMembro(turma.value, index, val)
                              }
                              placeholder="Voluntário"
                              searchPlaceholder="Buscar voluntário..."
                            />
                          </div>
                          <Select
                            value={slot.papel}
                            onValueChange={(val) =>
                              definirPapel(turma.value, index, val as PapelEscala)
                            }
                          >
                            <SelectTrigger className="w-28 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAPEL_VOLUNTARIO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-destructive"
                            onClick={() => removeSlot(turma.value, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {cacVencido && (
                          <p className="text-xs text-red-600 inline-flex items-center gap-1 pl-1">
                            <TriangleAlert className="h-3 w-3" />
                            CAC vencido nesta data
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {elegiveis.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum voluntário habilitado nesta turma.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={loading} onClick={handleSubmit}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
