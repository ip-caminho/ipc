"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Users, MapPin, Clock } from "lucide-react";
import { PG_STATUS_COLORS, DIA_SEMANA_LABELS } from "../lib/constants";

interface PGCardProps {
  pg: {
    _id: string;
    nome: string;
    descricao?: string;
    liderNome: string;
    coliderNome?: string | null;
    diaSemana?: string;
    horario?: string;
    local?: string;
    status: string;
    qtdMembros: number;
  };
  onClick?: () => void;
}

export function PGCard({ pg, onClick }: PGCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${onClick ? "" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{pg.nome}</CardTitle>
          <Badge className={PG_STATUS_COLORS[pg.status] || ""}>
            {pg.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Lider: {pg.liderNome}
          {pg.coliderNome && ` / ${pg.coliderNome}`}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {pg.qtdMembros} membros
          </span>
          {pg.diaSemana && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {DIA_SEMANA_LABELS[pg.diaSemana] || pg.diaSemana}
              {pg.horario && ` - ${pg.horario}`}
            </span>
          )}
          {pg.local && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {pg.local}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
