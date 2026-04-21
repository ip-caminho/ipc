"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Archive, Megaphone } from "lucide-react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PrayerActionButton } from "@features/pedidosOracao/components/PrayerActionButton";
import { PrayerAvatarStack } from "@features/pedidosOracao/components/PrayerAvatarStack";
import { UpdateTimeline, type UpdateItem } from "@features/pedidosOracao/components/UpdateTimeline";
import { AddUpdateModal } from "@features/pedidosOracao/components/AddUpdateModal";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@shared/lib/utils/cn";

const SCOPE_LABEL: Record<"private" | "pg" | "leaders" | "church", string> = {
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

export default function PedidoDetalhePage() {
  const params = useParams();
  const id = params.id as Id<"pedidosOracao">;

  // @ts-ignore Convex TS2589
  const pedido = useQuery(api.pedidosOracao.queries.getRequestDetail, { id });
  const archive = useMutation(api.pedidosOracao.mutations.archiveRequest);
  const [addOpen, setAddOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (pedido === undefined) {
    return (
      <ModuloGuard modulo="pedidos-oracao">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </ModuloGuard>
    );
  }

  if (!pedido) {
    return (
      <ModuloGuard modulo="pedidos-oracao">
        <div className="max-w-2xl mx-auto w-full text-center py-16">
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Link
            href="/pedidos-oracao"
            className="inline-block mt-3 text-sm text-primary underline"
          >
            Voltar ao mural
          </Link>
        </div>
      </ModuloGuard>
    );
  }

  const respondido = pedido.status === "RESPONDIDO";
  const arquivado = pedido.status === "ARQUIVADO";
  const nome = pedido.anonimo ? "Pedido anônimo" : pedido.autor?.nome || "Usuário";
  const foto = pedido.anonimo ? null : pedido.autor?.foto ?? null;

  const handleArchive = async () => {
    if (!confirm("Arquivar este pedido? Ele sai do mural mas continua em Meus pedidos.")) {
      return;
    }
    setArchiving(true);
    try {
      await archive({ pedidoId: id });
      toast.success("Pedido arquivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <ModuloGuard modulo="pedidos-oracao">
      <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
        <div className="flex flex-col gap-5 py-4 md:py-6 px-4">
          <DetailHeader backHref="/pedidos-oracao" />

          {/* Pedido principal */}
          <article
            className={cn(
              "rounded-xl border bg-card p-4 flex flex-col gap-3 relative",
              respondido && "opacity-80",
            )}
          >
            {respondido && (
              <Badge className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] font-semibold tracking-wider uppercase">
                Respondido
              </Badge>
            )}
            {arquivado && (
              <Badge
                variant="outline"
                className="absolute top-2 right-2 text-[9px] font-semibold tracking-wider uppercase"
              >
                Arquivado
              </Badge>
            )}

            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                {foto && <AvatarImage src={foto} alt={nome} />}
                <AvatarFallback
                  className={cn("text-sm", pedido.anonimo && "bg-secondary")}
                >
                  {pedido.anonimo ? "🙏" : nome.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    pedido.anonimo && "italic text-muted-foreground",
                  )}
                >
                  {nome}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {timeAgo(pedido.ultimaAtividadeEm)} · {SCOPE_LABEL[pedido.scope]}
                </p>
              </div>
            </div>

            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
              {pedido.descricao}
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              <PrayerAvatarStack
                orantes={pedido.orantes.map((o) => ({ nome: o.nome, foto: o.foto }))}
                total={pedido.qtdOrando}
                euOrando={pedido.euOrando}
              />
              {!arquivado && (
                <PrayerActionButton
                  pedidoId={id}
                  euOrando={pedido.euOrando}
                  size="md"
                />
              )}
            </div>
          </article>

          {/* Timeline de atualizacoes */}
          {pedido.atualizacoes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Atualizações
              </h2>
              <UpdateTimeline updates={pedido.atualizacoes as UpdateItem[]} />
            </section>
          )}

          {/* Acoes do autor */}
          {pedido.isOwner && !arquivado && (
            <div className="flex flex-col gap-2 pt-2 border-t">
              <p className="text-[11px] text-muted-foreground">Você é o autor</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(true)}
                  className="min-h-11"
                >
                  <Megaphone className="h-4 w-4 mr-1.5" aria-hidden />
                  Adicionar atualização
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="min-h-11 text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-1.5" aria-hidden />
                  Arquivar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddUpdateModal pedidoId={id} open={addOpen} onOpenChange={setAddOpen} />
    </ModuloGuard>
  );
}
