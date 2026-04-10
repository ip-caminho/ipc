"use client";

import Link from "next/link";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { STATUS_TURMA, DIA_SEMANA_LABELS } from "../lib/constants";

interface TurmaCardProps {
  turma: {
    _id: string;
    nome: string;
    status: string;
    dataInicio: string;
    diaSemana?: string;
    horario?: string;
    local?: string;
    vagasRestantes: number | null;
    instrutorNomeResolved: string;
  };
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function TurmaCard({ turma }: TurmaCardProps) {
  const statusOpt = STATUS_TURMA.find((s) => s.value === turma.status);

  return (
    <Link href={`/turmas/${turma._id}`}>
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-tight">{turma.nome}</h3>
            <Badge variant="outline" className={statusOpt?.color ?? ""}>
              {statusOpt?.label ?? turma.status}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(turma.dataInicio)}
              {turma.diaSemana && ` - ${DIA_SEMANA_LABELS[turma.diaSemana] ?? turma.diaSemana}`}
              {turma.horario && ` ${turma.horario}`}
            </span>
            {turma.local && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {turma.local}
              </span>
            )}
            {turma.vagasRestantes !== null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {turma.vagasRestantes} vagas
              </span>
            )}
          </div>

          {turma.instrutorNomeResolved && (
            <p className="text-xs text-muted-foreground">Instrutor: {turma.instrutorNomeResolved}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
