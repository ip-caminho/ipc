"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@shared/lib/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "ATIVO" | "RESPONDIDO" | "ARQUIVADO";

interface MyItem {
  _id: string;
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
  onOpenPedido: (pedidoId: string) => void;
}

export function MyRequestsView({ onOpenPedido }: Props) {
  const [status, setStatus] = useState<StatusFilter>("ATIVO");

  // @ts-ignore Convex TS2589
  const pedidos = useQuery(api.pedidosOracao.queries.listMyRequests, { status });

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
          <button
            key={p._id}
            type="button"
            onClick={() => onOpenPedido(p._id)}
            className="w-full text-left rounded-xl border bg-card p-3.5 flex flex-col gap-1.5 active:opacity-80"
          >
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground flex-1 truncate">
                {timeAgo(p.ultimaAtividadeEm)} · {SCOPE_LABEL[p.scope]}
                {p.anonimo && " · anônimo"}
              </p>
              {p.status === "RESPONDIDO" && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] font-semibold tracking-wider uppercase">
                  Respondido
                </Badge>
              )}
              {p.status === "ARQUIVADO" && (
                <Badge
                  variant="outline"
                  className="text-[9px] font-semibold tracking-wider uppercase"
                >
                  Arquivado
                </Badge>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground line-clamp-3 whitespace-pre-wrap">
              {p.descricao}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {p.qtdOrando === 0
                ? "Ninguém orou ainda"
                : p.qtdOrando === 1
                  ? "1 pessoa orou"
                  : `${p.qtdOrando} oraram`}
            </p>
          </button>
        ))
      )}
    </div>
  );
}
