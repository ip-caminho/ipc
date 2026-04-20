"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { api } from "@/convex/_generated/api";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { GuidedPrayerDeck } from "@features/pedidosOracao/components/GuidedPrayerDeck";
import { IntroSequence } from "@features/pedidosOracao/components/IntroSequence";
import type { GuidedCardData } from "@features/pedidosOracao/components/GuidedPrayerCard";

type Phase = "intro" | "deck";

export default function GuidedPrayerPage() {
  // @ts-ignore Convex TS2589
  const mural = useQuery(api.pedidosOracao.queries.listMuralRequests, {});
  const [phase, setPhase] = useState<Phase>("intro");

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setPhase("deck");
    }
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

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
      <div
        className="h-dvh flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {phase === "intro" && (
          <IntroSequence onComplete={() => setPhase("deck")} />
        )}
        {phase === "deck" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            <GuidedPrayerDeck pedidos={pedidos} />
          </motion.div>
        )}
      </div>
    </ModuloGuard>
  );
}
