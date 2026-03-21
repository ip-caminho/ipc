"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar } from "lucide-react";

interface EventoCardProps {
  evento: {
    _id: string;
    titulo: string;
    data: string;
    dataFim?: string;
    descricao?: string;
    ministerioNome?: string | null;
  };
  onClick?: () => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function EventoCard({ evento, onClick }: EventoCardProps) {
  return (
    <Card
      className={`transition-colors ${onClick ? "cursor-pointer hover:bg-muted/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{evento.titulo}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {formatDate(evento.data)}
                {evento.dataFim && evento.dataFim !== evento.data && ` — ${formatDate(evento.dataFim)}`}
              </span>
              {evento.ministerioNome && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {evento.ministerioNome}
                </Badge>
              )}
            </div>
            {evento.descricao && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {evento.descricao}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
