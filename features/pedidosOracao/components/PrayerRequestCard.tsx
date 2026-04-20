"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@shared/lib/utils/cn";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrayerAvatarStack } from "./PrayerAvatarStack";
import { PrayerActionButton } from "./PrayerActionButton";
import { AddUpdateModal } from "./AddUpdateModal";
import type { Id } from "@/convex/_generated/dataModel";

export interface PrayerRequestCardData {
  _id: Id<"pedidosOracao">;
  descricao: string;
  status: "ATIVO" | "RESPONDIDO" | "ARQUIVADO";
  scope: "private" | "pg" | "leaders" | "church";
  anonimo: boolean;
  ultimaAtividadeEm: number;
  autor: { _id: string; nome: string; foto: string | null } | null;
  isOwner: boolean;
  qtdOrando: number;
  euOrando: boolean;
  primeirosOrantes: { nome: string; foto: string | null }[];
}

const SCOPE_LABEL: Record<PrayerRequestCardData["scope"], string> = {
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
  pedido: PrayerRequestCardData;
  onClick?: () => void;
}

export function PrayerRequestCard({ pedido, onClick }: Props) {
  const respondido = pedido.status === "RESPONDIDO";
  const nome = pedido.anonimo ? "Pedido anônimo" : pedido.autor?.nome || "Usuário";
  const foto = pedido.anonimo ? null : pedido.autor?.foto ?? null;
  const [addOpen, setAddOpen] = useState(false);

  const openAddUpdate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddOpen(true);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full text-left rounded-xl border bg-card p-3.5 flex flex-col gap-2 transition-colors active:opacity-80",
        respondido && "opacity-75",
      )}
    >
      {respondido && (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] font-semibold tracking-wider uppercase"
        >
          Respondido
        </Badge>
      )}

      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          {foto && <AvatarImage src={foto} alt={nome} />}
          <AvatarFallback className={cn("text-xs", pedido.anonimo && "bg-secondary")}>
            {pedido.anonimo ? "🙏" : nome.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              pedido.anonimo && "italic text-muted-foreground",
            )}
          >
            {nome}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {timeAgo(pedido.ultimaAtividadeEm)} · {SCOPE_LABEL[pedido.scope]}
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-foreground line-clamp-4 whitespace-pre-wrap">
        {pedido.descricao}
      </p>

      <div className="flex items-center justify-between gap-2 mt-0.5">
        <PrayerAvatarStack
          orantes={pedido.primeirosOrantes}
          total={pedido.qtdOrando}
          euOrando={pedido.euOrando}
        />
        {pedido.isOwner ? (
          <button
            type="button"
            onClick={openAddUpdate}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border h-8 px-3 text-xs font-medium text-foreground active:opacity-80"
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            Atualizar
          </button>
        ) : (
          <PrayerActionButton pedidoId={pedido._id} euOrando={pedido.euOrando} />
        )}
      </div>

      {pedido.isOwner && (
        <AddUpdateModal
          pedidoId={pedido._id}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}
    </button>
  );
}
