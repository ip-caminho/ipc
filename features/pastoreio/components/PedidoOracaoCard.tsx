"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Archive, CheckCircle } from "lucide-react";
import { STATUS_PEDIDO_COLORS } from "../lib/constants";

interface PedidoOracaoCardProps {
  pedido: {
    _id: string;
    membroNome: string;
    descricao: string;
    status: string;
    criadoEm: number;
  };
  canChangeStatus?: boolean;
  onArchive?: () => void;
  onMarkAnswered?: () => void;
}

export function PedidoOracaoCard({
  pedido,
  canChangeStatus,
  onArchive,
  onMarkAnswered,
}: PedidoOracaoCardProps) {
  const dataFormatada = new Date(pedido.criadoEm).toLocaleDateString("pt-BR");

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{pedido.membroNome}</p>
            <p className="text-xs text-muted-foreground">{dataFormatada}</p>
          </div>
          <Badge className={STATUS_PEDIDO_COLORS[pedido.status] || ""}>
            {pedido.status}
          </Badge>
        </div>
        <p className="text-sm">{pedido.descricao}</p>
        {canChangeStatus && pedido.status === "ATIVO" && (
          <div className="flex gap-2 pt-1">
            {onMarkAnswered && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAnswered}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Respondido
              </Button>
            )}
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onArchive}
              >
                <Archive className="h-3.5 w-3.5 mr-1" />
                Arquivar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
