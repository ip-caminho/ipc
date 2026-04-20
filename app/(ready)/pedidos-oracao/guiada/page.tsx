"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { GuidedPrayerDeck } from "@features/pedidosOracao/components/GuidedPrayerDeck";
import type { GuidedCardData } from "@features/pedidosOracao/components/GuidedPrayerCard";

export default function GuidedPrayerPage() {
  // @ts-ignore Convex TS2589
  const mural = useQuery(api.pedidosOracao.queries.listMuralRequests, {});

  const pedidos: GuidedCardData[] = (mural ?? [])
    .filter((p: any) => p.status === "ATIVO")
    .map((p: any) => ({
      _id: p._id,
      descricao: p.descricao,
      anonimo: !!p.anonimo,
      autor: p.autor ?? null,
      qtdOrando: p.qtdOrando,
      euOrando: p.euOrando,
      primeirosOrantes: p.primeirosOrantes ?? [],
    }));

  return (
    <ModuloGuard modulo="pedidos-oracao">
      <GuidedPrayerDeck pedidos={pedidos} />
    </ModuloGuard>
  );
}
