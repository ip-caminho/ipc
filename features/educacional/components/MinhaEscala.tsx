"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TURMA_COLORS,
  PAPEL_VOLUNTARIO_LABELS,
  PAPEL_VOLUNTARIO_COLORS,
} from "../lib/constants";
import type { PapelEscala } from "../lib/escala";

export interface MinhaEscalaItem {
  _id: string;
  data: string;
  subgrupo?: string;
  papel: PapelEscala;
}

interface MinhaEscalaProps {
  itens: MinhaEscalaItem[];
}

export function MinhaEscala({ itens }: MinhaEscalaProps) {
  if (itens.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-3 space-y-2">
        <p className="text-sm font-medium inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Minha escala
        </p>
        <div className="space-y-1.5">
          {itens.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm">
                {format(parseISO(item.data), "dd/MM (EEEE)", { locale: ptBR })}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {item.subgrupo && (
                  <Badge
                    variant="outline"
                    className={TURMA_COLORS[item.subgrupo] || ""}
                  >
                    {item.subgrupo}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={PAPEL_VOLUNTARIO_COLORS[item.papel] || ""}
                >
                  {PAPEL_VOLUNTARIO_LABELS[item.papel] || item.papel}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
