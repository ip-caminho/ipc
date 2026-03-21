"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TIPO_VISITA_COLORS } from "../lib/constants";

interface VisitaCardProps {
  visita: {
    _id: string;
    membroNome: string;
    visitanteNome: string;
    data: string;
    tipo: string;
    observacoes?: string;
  };
  canDelete?: boolean;
  onDelete?: () => void;
}

export function VisitaCard({ visita, canDelete, onDelete }: VisitaCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-1.5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{visita.membroNome}</p>
            <p className="text-xs text-muted-foreground">
              Visitado por {visita.visitanteNome}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={TIPO_VISITA_COLORS[visita.tipo] || ""}>
              {visita.tipo}
            </Badge>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(visita.data), "dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
        </p>
        {visita.observacoes && (
          <p className="text-sm text-muted-foreground mt-1">
            {visita.observacoes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
