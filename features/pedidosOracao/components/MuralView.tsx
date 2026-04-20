"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";
import { PrayerRequestCard, type PrayerRequestCardData } from "./PrayerRequestCard";

interface Props {
  onOpenPedido: (pedidoId: string) => void;
}

export function MuralView({ onOpenPedido }: Props) {
  // @ts-ignore Convex TS2589
  const pedidos = useQuery(api.pedidosOracao.queries.listMuralRequests, {});

  if (pedidos === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-base font-medium">Nenhum pedido por enquanto</p>
        <p className="text-sm text-muted-foreground mt-1">
          Compartilhe um pedido acima para a comunidade orar com você.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Recentes</SectionLabel>
      {(pedidos as PrayerRequestCardData[]).map((p) => (
        <PrayerRequestCard
          key={p._id}
          pedido={p}
          onClick={() => onOpenPedido(p._id)}
        />
      ))}
    </div>
  );
}
