"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@/components/animate-ui/components/animate/avatar-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Church, HandHeart, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-yellow-100 text-yellow-800",
  RESPONDIDO: "bg-green-100 text-green-800",
  ARQUIVADO: "bg-gray-100 text-gray-800",
};

interface PedidoOracaoListCardProps {
  pedido: {
    _id: string;
    membroNome: string;
    descricao: string;
    status: string;
    criadoEm: number;
    isOwner: boolean;
    qtdIntercessores: number;
    euOrando: boolean;
    qtdComentarios: number;
    intercessoresResumo?: Array<{ nome: string; foto: string | null }>;
    compartilhadoIgreja?: boolean;
  };
  onClick: () => void;
}

export function PedidoOracaoListCard({
  pedido,
  onClick,
}: PedidoOracaoListCardProps) {
  // @ts-ignore Convex TS2589
  const toggleOrando = useMutation(api.pedidosOracao.mutations.toggleOrando);

  const handleToggleOrando = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await toggleOrando({
        pedidoId: pedido._id as Id<"pedidosOracao">,
      });
      toast.success(
        result.orando
          ? "Voce esta orando por este pedido"
          : "Removido da lista de oracao"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const dataFormatada = new Date(pedido.criadoEm).toLocaleDateString("pt-BR");

  const avatarItems = [
    ...(pedido.intercessoresResumo ?? []).map((i, idx) => (
      <Avatar key={idx} className="h-6 w-6 border-2 border-background">
        {i.foto && <AvatarImage src={i.foto} />}
        <AvatarFallback className="text-[9px]">
          {i.nome?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
        <AvatarGroupTooltip>{i.nome}</AvatarGroupTooltip>
      </Avatar>
    )),
    ...(pedido.qtdIntercessores > 5
      ? [
          <Avatar key="overflow" className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-[9px]">
              +{pedido.qtdIntercessores - 5}
            </AvatarFallback>
            <AvatarGroupTooltip>
              +{pedido.qtdIntercessores - 5} orando
            </AvatarGroupTooltip>
          </Avatar>,
        ]
      : []),
  ];

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">
                {pedido.membroNome?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {pedido.membroNome}
                {pedido.isOwner && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    (voce)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{dataFormatada}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {pedido.compartilhadoIgreja && (
              <Church className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Badge className={STATUS_COLORS[pedido.status] || ""}>
              {pedido.status}
            </Badge>
          </div>
        </div>

        <p className="text-sm line-clamp-3">{pedido.descricao}</p>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            {avatarItems.length > 0 && (
              <AvatarGroup className="h-6 -space-x-1.5">
                {avatarItems}
              </AvatarGroup>
            )}

            {/* Botao de toggle orar */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleToggleOrando}
                    className={`flex items-center justify-center h-6 w-6 rounded-full border-2 transition-colors ${
                      pedido.euOrando
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {pedido.euOrando ? (
                      <HandHeart className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {pedido.euOrando ? "Parar de orar" : "Orar por este pedido"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {pedido.qtdComentarios > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {pedido.qtdComentarios}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
