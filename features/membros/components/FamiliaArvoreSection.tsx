"use client";

import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ArvoreFamiliar } from "./ArvoreFamiliar";

// Arvore genealogica no detalhe do membro. Read-only: a rede e derivada de
// membros.conjugeId + tabela responsaveis (query membros.familia.redeFamiliar).
// So aparece quando ha mais de uma pessoa na rede (senao nao ha o que desenhar).
export function FamiliaArvoreSection({ membroId }: { membroId: Id<"membros"> }) {
  const rede = useQuery(api.membros.familia.redeFamiliar, { membroId });

  if (rede === undefined) {
    return <Skeleton className="h-[420px] w-full rounded-xl" />;
  }
  if (!rede || rede.pessoas.length <= 1) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Arvore familiar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ArvoreFamiliar
          rede={rede}
          focusId={rede.focoEntidadeId as Id<"entidades">}
          altura="h-[420px]"
        />
      </CardContent>
    </Card>
  );
}
