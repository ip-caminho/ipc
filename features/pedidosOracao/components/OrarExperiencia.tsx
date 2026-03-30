"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { X, ChevronLeft, ChevronRight, Heart, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils/cn";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrarExperienciaProps {
  pedidos: Array<{ _id: Id<"pedidosOracao">; membroNome: string; descricao: string }>;
  onClose: () => void;
}

function PedidoSlide({ pedidoId }: { pedidoId: Id<"pedidosOracao"> }) {
  // @ts-ignore Convex TS2589
  const pedido = useQuery(api.pedidosOracao.queries.getById, { id: pedidoId });
  const toggleOrando = useMutation(api.pedidosOracao.mutations.toggleOrando);
  const [toggling, setToggling] = useState(false);

  if (pedido === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-muted-foreground">Pedido não encontrado</p>
      </div>
    );
  }

  const atualizacoes = (pedido.comentarios || []).filter((c: any) => c.tipo === "ATUALIZACAO");

  const handleToggle = async () => {
    setToggling(true);
    try {
      const result = await toggleOrando({ pedidoId });
      toast.success(result.orando ? "Você está orando por este pedido" : "Removido da lista de oração");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 py-4 overflow-y-auto flex-1">
      {/* Autor */}
      <Avatar className="h-16 w-16 mb-3">
        {pedido.autor?.foto && <AvatarImage src={pedido.autor.foto} />}
        <AvatarFallback className="text-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          {pedido.autor?.nome?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <p className="text-base font-medium">{pedido.autor?.nome}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {formatDistanceToNow(pedido.criadoEm, { addSuffix: true, locale: ptBR })}
      </p>

      {/* Descrição */}
      <div className="mt-6 w-full">
        <p className="text-base leading-relaxed text-center whitespace-pre-wrap">
          {pedido.descricao}
        </p>
      </div>

      {/* Atualizações */}
      {atualizacoes.length > 0 && (
        <div className="mt-6 w-full space-y-2">
          <div className="flex items-center gap-2 justify-center">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Atualizações</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {atualizacoes.map((a: any) => (
            <div key={a._id} className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <Megaphone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm">{a.texto}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(a.criadoEm, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Intercessores */}
      <div className="mt-6 flex items-center gap-2">
        {pedido.intercessores && pedido.intercessores.length > 0 && (
          <div className="flex -space-x-2">
            {pedido.intercessores.slice(0, 5).map((i: any) => (
              <Avatar key={i._id} className="h-7 w-7 border-2 border-background">
                {i.foto && <AvatarImage src={i.foto} />}
                <AvatarFallback className="text-[10px]">
                  {i.nome?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
        <span className="text-sm text-muted-foreground">
          {pedido.intercessores?.length || 0} pessoa{(pedido.intercessores?.length || 0) !== 1 ? "s" : ""} orando
        </span>
      </div>

      {/* Botão orar */}
      <Button
        onClick={handleToggle}
        disabled={toggling}
        className={cn(
          "mt-6 w-full min-h-[48px] text-base gap-2 rounded-xl",
          pedido.euOrando
            ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
            : "bg-blue-600 text-white hover:bg-blue-700",
        )}
      >
        <Heart className={cn("h-5 w-5", pedido.euOrando && "fill-current")} />
        {pedido.euOrando ? "Estou orando" : "Orar por este pedido"}
      </Button>
    </div>
  );
}

export function OrarExperiencia({ pedidos, onClose }: OrarExperienciaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goTo = (index: number, dir?: "left" | "right") => {
    setSwipeDir(dir || null);
    setCurrentIndex(index);
    setFadeKey((k) => k + 1);
  };

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pedidos.length - 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Only swipe if horizontal movement > 50px and more horizontal than vertical
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && hasNext) {
      goTo(currentIndex + 1, "left");
    } else if (dx > 0 && hasPrev) {
      goTo(currentIndex - 1, "right");
    } else if (dx < 0 && !hasNext) {
      onClose();
    }
  };

  if (pedidos.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Nenhum pedido de oração ativo</p>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
        </div>
      </div>
    );
  }

  const pedido = pedidos[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] bg-blue-50/95 dark:bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-end px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col mx-4 bg-background rounded-2xl shadow-lg border overflow-hidden"
        key={fadeKey}
        style={{ animation: `${swipeDir === "right" ? "slideFromLeft" : "slideFromRight"} 0.2s ease-out` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <PedidoSlide pedidoId={pedido._id} />
      </div>

      {/* Navegação — fixo no fundo */}
      <div className="flex flex-col items-center gap-1 px-4 py-4 mt-auto shrink-0">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            className="min-h-[44px] gap-1"
            disabled={!hasPrev}
            onClick={() => goTo(currentIndex - 1, "right")}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="ghost"
            className="min-h-[44px] gap-1"
            onClick={hasNext ? () => goTo(currentIndex + 1, "left") : onClose}
          >
            {hasNext ? "Próximo" : "Encerrar"}
            {hasNext && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} de {pedidos.length}
        </span>
      </div>

      <style>{`
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
