"use client";

import { use } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { LouvorDetalhe } from "@features/louvor/components/LouvorDetalhe";

export default function LouvorDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ModuloGuard modulo="louvor">
      <HeaderLayout>
        <DetailHeader backHref="/louvor" />
        <LouvorDetalhe louvorId={id as Id<"louvores">} />
      </HeaderLayout>
    </ModuloGuard>
  );
}
