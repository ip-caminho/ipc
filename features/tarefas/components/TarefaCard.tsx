"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Card, CardContent } from "@/shared/components/ui/card";
import { MessageSquare, Calendar } from "lucide-react";
import { TarefaStatusBadge } from "./TarefaStatusBadge";
import { TarefaPrioridadeBadge } from "./TarefaPrioridadeBadge";

interface TarefaCardProps {
  tarefa: {
    _id: string;
    titulo: string;
    status: string;
    prioridade: string;
    dataVencimento?: string;
    responsavelNome: string;
    responsavelFoto: string | null;
    qtdComentarios: number;
    moduloRelacionado?: string;
    referenciaTitulo?: string;
  };
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false;
  const hoje = new Date().toISOString().split("T")[0];
  return dateStr < hoje;
}

export function TarefaCard({ tarefa }: TarefaCardProps) {
  const overdue = isOverdue(tarefa.dataVencimento) &&
    tarefa.status !== "CONCLUIDA" && tarefa.status !== "CANCELADA";

  return (
    <Link href={`/tarefas/${tarefa._id}`}>
      <Card className={`hover:bg-accent/50 transition-colors ${overdue ? "border-red-300" : ""}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-tight line-clamp-2">{tarefa.titulo}</h3>
            <TarefaPrioridadeBadge prioridade={tarefa.prioridade} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <TarefaStatusBadge status={tarefa.status} />
            {tarefa.dataVencimento && (
              <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                <Calendar className="h-3 w-3" />
                {formatDate(tarefa.dataVencimento)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                {tarefa.responsavelFoto && <AvatarImage src={tarefa.responsavelFoto} />}
                <AvatarFallback className="text-[10px]">
                  {tarefa.responsavelNome.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {tarefa.responsavelNome}
              </span>
            </div>
            {tarefa.qtdComentarios > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {tarefa.qtdComentarios}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
