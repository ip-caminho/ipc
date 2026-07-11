"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Pencil, Trash2, TriangleAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TURMA_COLORS,
  PAPEL_VOLUNTARIO_LABELS,
  PAPEL_VOLUNTARIO_COLORS,
} from "../lib/constants";
import type { DiaEscala, EscalaMembro, TurmaSlot } from "../lib/escala";

function MembroChip({ m }: { m: EscalaMembro }) {
  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="h-6 w-6 shrink-0">
        {m.foto && <AvatarImage src={m.foto} alt={m.nome} />}
        <AvatarFallback className="text-[10px]">
          {m.nome?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm truncate">{m.nome}</span>
      <Badge
        variant="secondary"
        className={`shrink-0 ${PAPEL_VOLUNTARIO_COLORS[m.papel] || ""}`}
      >
        {PAPEL_VOLUNTARIO_LABELS[m.papel] || m.papel}
      </Badge>
      {m.cacVencido && (
        <TriangleAlert
          className="h-3.5 w-3.5 shrink-0 text-red-600"
          aria-label="CAC vencido nesta data"
        />
      )}
    </div>
  );
}

function TurmaLinha({ turma }: { turma: TurmaSlot }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <Badge
        variant="outline"
        className={`w-fit shrink-0 sm:w-16 ${TURMA_COLORS[turma.subgrupo] || ""}`}
      >
        {turma.subgrupo}
      </Badge>
      <div className="flex-1 min-w-0 space-y-1">
        {turma.membros.length === 0 ? (
          <span className="text-xs text-amber-600 inline-flex items-center gap-1">
            <TriangleAlert className="h-3 w-3" />
            sem professor
          </span>
        ) : (
          <>
            {turma.membros.map((m, i) => (
              <MembroChip key={`${m.membroId}-${i}`} m={m} />
            ))}
            {turma.semProfessor && (
              <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                <TriangleAlert className="h-3 w-3" />
                sem professor
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface EscalaGradeProps {
  dias: DiaEscala[];
  canWrite: boolean;
  onEditDia: (dia: DiaEscala) => void;
  onRemoveDia: (data: string) => void;
}

export function EscalaGrade({
  dias,
  canWrite,
  onEditDia,
  onRemoveDia,
}: EscalaGradeProps) {
  return (
    <div className="space-y-3">
      {dias.map((dia) => (
        <Card key={dia.data}>
          <CardContent className="py-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {format(parseISO(dia.data), "dd/MM (EEEE)", { locale: ptBR })}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dia.temLacuna && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800"
                    >
                      <TriangleAlert className="h-3 w-3 mr-1" />
                      Lacuna
                    </Badge>
                  )}
                  {dia.conflitos.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-800"
                    >
                      <TriangleAlert className="h-3 w-3 mr-1" />
                      Conflito: {dia.conflitos.join(", ")}
                    </Badge>
                  )}
                </div>
              </div>
              {canWrite && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => onEditDia(dia)}
                    aria-label="Editar escala"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => onRemoveDia(dia.data)}
                    aria-label="Excluir escala do dia"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {dia.turmas.map((turma) => (
                <TurmaLinha key={turma.subgrupo} turma={turma} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
