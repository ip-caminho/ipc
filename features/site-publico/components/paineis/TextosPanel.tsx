"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TextosSiteForm } from "@features/site-publico/components/TextosSiteForm";

// Painel "Textos" do hub do site público. Edita título/subtítulo do hero da home.
export function TextosPanel() {
  // @ts-ignore Convex TS2589
  const textos = useQuery(api.preferencias.queries.getTextosSite);
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Título e subtítulo do topo da home. As páginas de conteúdo (Quem somos) são
        editadas diretamente no código.
      </p>
      {textos === undefined ? (
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : (
        <TextosSiteForm initial={textos} />
      )}
    </div>
  );
}
