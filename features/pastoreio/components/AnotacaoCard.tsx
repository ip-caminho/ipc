"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";

interface AnotacaoCardProps {
  anotacao: {
    _id: string;
    membroNome: string;
    autorNome: string;
    texto: string;
    criadoEm: number;
    atualizadoEm?: number;
  };
  canDelete?: boolean;
  onDelete?: () => void;
}

export function AnotacaoCard({
  anotacao,
  canDelete,
  onDelete,
}: AnotacaoCardProps) {
  const dataFormatada = new Date(anotacao.criadoEm).toLocaleDateString("pt-BR");

  return (
    <Card>
      <CardContent className="pt-4 space-y-1.5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{anotacao.membroNome}</p>
            <p className="text-xs text-muted-foreground">
              Por {anotacao.autorNome} — {dataFormatada}
            </p>
          </div>
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
        <p className="text-sm whitespace-pre-wrap">{anotacao.texto}</p>
      </CardContent>
    </Card>
  );
}
