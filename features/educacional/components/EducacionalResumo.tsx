"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils/cn";
import {
  Baby,
  CalendarCheck,
  Cake,
  Heart,
  TriangleAlert,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TURMA_OPTIONS, TURMA_COLORS } from "../lib/constants";

interface Tile {
  key: string;
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  onClick: () => void;
}

function TileCard({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <button
      type="button"
      onClick={tile.onClick}
      className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="h-full transition-colors hover:bg-muted/50 active:bg-muted">
        <CardContent className="py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{tile.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {tile.value}
          </div>
          {tile.sub && <div className="mt-1">{tile.sub}</div>}
        </CardContent>
      </Card>
    </button>
  );
}

interface EducacionalResumoProps {
  totalCriancas: number;
  countPorTurma: Record<string, number>;
  proximoDomingoData: string | null;
  lacunasProximo: number | null; // null = sem escala montada
  aniversariantesSemana: number;
  totalVoluntarios: number;
  cacAtencao: number;
  showVoluntarios: boolean;
  onVerCriancas: () => void;
  onVerEscala: () => void;
  onVerAniversarios: () => void;
  onVerVoluntarios: () => void;
}

export function EducacionalResumo({
  totalCriancas,
  countPorTurma,
  proximoDomingoData,
  lacunasProximo,
  aniversariantesSemana,
  totalVoluntarios,
  cacAtencao,
  showVoluntarios,
  onVerCriancas,
  onVerEscala,
  onVerAniversarios,
  onVerVoluntarios,
}: EducacionalResumoProps) {
  // Sub do próximo domingo: sem escala / completa / N lacunas.
  let escalaSub: React.ReactNode;
  if (lacunasProximo === null) {
    escalaSub = (
      <span className="text-xs text-muted-foreground">
        Nenhuma escala futura montada
      </span>
    );
  } else if (lacunasProximo === 0) {
    escalaSub = (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Escala completa
      </span>
    );
  } else {
    escalaSub = (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <TriangleAlert className="h-3.5 w-3.5" />
        {lacunasProximo} turma{lacunasProximo !== 1 ? "s" : ""} sem professor
      </span>
    );
  }

  const tiles: Tile[] = [
    {
      key: "criancas",
      icon: Baby,
      label: "Crianças",
      value: totalCriancas,
      onClick: onVerCriancas,
      sub: (
        <div className="flex flex-wrap gap-1">
          {TURMA_OPTIONS.filter((t) => (countPorTurma[t.value] ?? 0) > 0).map(
            (t) => (
              <Badge
                key={t.value}
                variant="secondary"
                className={cn("text-[10px]", TURMA_COLORS[t.value])}
              >
                {t.value}·{countPorTurma[t.value]}
              </Badge>
            )
          )}
        </div>
      ),
    },
    {
      key: "escala",
      icon: CalendarCheck,
      label: "Próximo domingo",
      value: proximoDomingoData
        ? format(parseISO(proximoDomingoData), "dd/MM", { locale: ptBR })
        : "—",
      sub: escalaSub,
      onClick: onVerEscala,
    },
    {
      key: "aniversarios",
      icon: Cake,
      label: "Aniversários",
      value: aniversariantesSemana,
      sub: (
        <span className="text-xs text-muted-foreground">Nos próximos 7 dias</span>
      ),
      onClick: onVerAniversarios,
    },
  ];

  if (showVoluntarios) {
    tiles.push({
      key: "voluntarios",
      icon: Heart,
      label: "Voluntários",
      value: totalVoluntarios,
      sub:
        cacAtencao > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <TriangleAlert className="h-3.5 w-3.5" />
            {cacAtencao} CAC a vencer
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">CAC em dia</span>
        ),
      onClick: onVerVoluntarios,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <TileCard key={tile.key} tile={tile} />
      ))}
    </div>
  );
}
