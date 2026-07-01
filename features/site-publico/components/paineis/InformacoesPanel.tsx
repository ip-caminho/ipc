"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { InformacoesSiteForm } from "@features/site-publico/components/InformacoesSiteForm";

// Painel "Informações" do hub do site público (sem chrome de página — o hub já
// tem HeaderLayout/PageHeader). Auto-busca os dados via Convex.
export function InformacoesPanel() {
  // @ts-ignore Convex TS2589
  const igreja = useQuery(api.preferencias.queries.getIgrejaInfo);
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Estes dados alimentam o rodapé do site, a página Visite e o cabeçalho de busca
        (SEO). Ao salvar, o site reflete a mudança automaticamente.
      </p>
      {igreja === undefined ? (
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : (
        <InformacoesSiteForm initial={igreja} />
      )}
    </div>
  );
}
