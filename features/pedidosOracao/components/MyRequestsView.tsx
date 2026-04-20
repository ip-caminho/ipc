"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreVertical, Megaphone, Archive } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AddUpdateModal } from "./AddUpdateModal";

type StatusFilter = "ATIVO" | "RESPONDIDO" | "ARQUIVADO";

interface MyItem {
  _id: Id<"pedidosOracao">;
  descricao: string;
  status: StatusFilter;
  scope: "private" | "pg" | "leaders" | "church";
  anonimo: boolean;
  criadoEm: number;
  ultimaAtividadeEm: number;
  qtdOrando: number;
}

const CHIPS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ATIVO", label: "Ativos" },
  { value: "RESPONDIDO", label: "Respondidos" },
  { value: "ARQUIVADO", label: "Arquivados" },
];

const SCOPE_LABEL: Record<MyItem["scope"], string> = {
  private: "somente eu",
  pg: "meu PG",
  leaders: "líderes e pastores",
  church: "toda a igreja",
};

function timeAgo(ts: number): string {
  try {
    return formatDistanceToNow(fromUnixTime(ts / 1000), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "";
  }
}

interface Props {
  // Prop mantida por compatibilidade; a navegacao aqui acontece via <Link>.
  onOpenPedido?: (pedidoId: string) => void;
}

interface MyItemCardProps {
  pedido: MyItem;
  onAddUpdate: (id: Id<"pedidosOracao">) => void;
  onArchive: (id: Id<"pedidosOracao">) => void;
}

function MyItemCard({ pedido, onAddUpdate, onArchive }: MyItemCardProps) {
  const arquivado = pedido.status === "ARQUIVADO";

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className="relative">
      <Link
        href={`/pedidos-oracao/${pedido._id}`}
        className="block rounded-xl border bg-card p-3.5 active:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2 pr-8">
          <p className="text-[10px] text-muted-foreground flex-1 truncate">
            {timeAgo(pedido.ultimaAtividadeEm)} · {SCOPE_LABEL[pedido.scope]}
            {pedido.anonimo && " · anônimo"}
          </p>
          {pedido.status === "RESPONDIDO" && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] font-semibold tracking-wider uppercase">
              Respondido
            </Badge>
          )}
          {arquivado && (
            <Badge
              variant="outline"
              className="text-[9px] font-semibold tracking-wider uppercase"
            >
              Arquivado
            </Badge>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-foreground line-clamp-3 whitespace-pre-wrap mt-1.5">
          {pedido.descricao}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {pedido.qtdOrando === 0
            ? "Ninguém orou ainda"
            : pedido.qtdOrando === 1
              ? "1 pessoa orou"
              : `${pedido.qtdOrando} oraram`}
        </p>
      </Link>

      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={stop}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Ações do pedido"
            className="flex items-center justify-center rounded-full min-h-9 min-w-9 text-muted-foreground hover:bg-secondary"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              disabled={arquivado}
              onClick={() => onAddUpdate(pedido._id)}
              className="cursor-pointer"
            >
              <Megaphone className="size-4" />
              Adicionar atualização
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={arquivado}
              onClick={() => onArchive(pedido._id)}
              className={cn("cursor-pointer", !arquivado && "text-destructive focus:text-destructive")}
            >
              <Archive className="size-4" />
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function MyRequestsView(_props: Props) {
  const [status, setStatus] = useState<StatusFilter>("ATIVO");
  const [updatePedidoId, setUpdatePedidoId] = useState<Id<"pedidosOracao"> | null>(null);
  const archive = useMutation(api.pedidosOracao.mutations.archiveRequest);

  // @ts-ignore Convex TS2589
  const pedidos = useQuery(api.pedidosOracao.queries.listMyRequests, { status });

  const handleArchive = async (id: Id<"pedidosOracao">) => {
    if (!confirm("Arquivar este pedido? Ele sai do mural mas continua em Meus pedidos.")) {
      return;
    }
    try {
      await archive({ pedidoId: id });
      toast.success("Pedido arquivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pr-6 pb-1">
        {CHIPS.map((chip) => {
          const active = status === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatus(chip.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors min-h-[32px]",
                active ? "text-white" : "border text-foreground",
              )}
              style={active ? { backgroundColor: "#1a1a1a" } : undefined}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {pedidos === undefined ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum pedido {status === "ATIVO" ? "ativo" : status === "RESPONDIDO" ? "respondido" : "arquivado"}.
          </p>
        </div>
      ) : (
        (pedidos as MyItem[]).map((p) => (
          <MyItemCard
            key={p._id}
            pedido={p}
            onAddUpdate={setUpdatePedidoId}
            onArchive={handleArchive}
          />
        ))
      )}

      {updatePedidoId && (
        <AddUpdateModal
          pedidoId={updatePedidoId}
          open={!!updatePedidoId}
          onOpenChange={(next) => {
            if (!next) setUpdatePedidoId(null);
          }}
        />
      )}
    </div>
  );
}
