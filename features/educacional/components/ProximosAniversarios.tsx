"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Cake } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TURMA_OPTIONS, TURMA_COLORS } from "../lib/constants";

function rotuloProximidade(dias: number): string {
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanha";
  if (dias <= 30) return `Em ${dias} dias`;
  return "";
}

export function ProximosAniversarios() {
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const aniversarios = useQuery(api.educacional.queries.proximosAniversarios, {
    turma: turmaFilter === "all" ? undefined : turmaFilter,
  });

  return (
    <div className="space-y-4">
      <Select value={turmaFilter} onValueChange={setTurmaFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Todas as turmas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as turmas</SelectItem>
          {TURMA_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {aniversarios === undefined ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : aniversarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma crianca com data de nascimento cadastrada
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {aniversarios.map((a) => {
            const proximidade = rotuloProximidade(a.diasAteAniversario);
            const turmaColor = TURMA_COLORS[a.turma] || "bg-gray-100 text-gray-800";
            return (
              <Card key={a.entidadeId}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      {a.foto && <AvatarImage src={a.foto} alt={a.nome} />}
                      <AvatarFallback className="text-sm">
                        {a.nome?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Cake className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(a.dataNascimento), "dd/MM", { locale: ptBR })}
                          {" · fara "}
                          {a.faraIdade}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={turmaColor}>
                        {a.turma}
                      </Badge>
                      {proximidade && (
                        <span className="text-xs font-medium text-primary">
                          {proximidade}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
