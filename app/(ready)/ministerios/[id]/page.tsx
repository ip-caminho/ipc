"use client";

import { use } from "react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { MinisterioDetalhe } from "@features/ministerios/components/MinisterioDetalhe";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

export default function MinisterioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <ModuloGuard modulo="ministerios">
      <HeaderLayout>
        <DetailHeader backHref="/ministerios" />
        <MinisterioDetalhe
          ministerioId={id as Id<"ministerios">}
          onBack={() => router.push("/ministerios")}
        />
      </HeaderLayout>
    </ModuloGuard>
  );
}
