"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { FamiliaDrawer } from "@features/secretarioExecutivo/components/FamiliaDrawer";
import { ArvoreFamiliar, type PessoaLite } from "./ArvoreFamiliar";

// Arvore genealogica no detalhe do membro. A rede e derivada de
// membros.conjugeId + tabela responsaveis (query membros.familia.redeFamiliar).
// So aparece quando ha mais de uma pessoa na rede. Para quem tem rol:update /
// membros:update, cada no-membro ganha um botao de editar vinculos, que abre o
// FamiliaDrawer daquele no.
export function FamiliaArvoreSection({ membroId }: { membroId: Id<"membros"> }) {
  const { can } = useAuth();
  const podeEditar = can("rol:update") || can("membros:update");
  const rede = useQuery(api.membros.familia.redeFamiliar, { membroId });

  // No em edicao (drawer). Precisa do membroId do no (o drawer edita por membro).
  const [alvo, setAlvo] = useState<{
    membroId: Id<"membros">;
    entidadeId: string;
    nome: string;
  } | null>(null);

  if (rede === undefined) {
    return <Skeleton className="h-[420px] w-full rounded-xl" />;
  }
  if (!rede || rede.pessoas.length <= 1) return null;

  const abrirEdicao = (node: PessoaLite) => {
    if (!node.membroId) return;
    setAlvo({
      membroId: node.membroId,
      entidadeId: node._id,
      nome: node.nomeCompleto,
    });
  };

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
          onEditar={podeEditar ? abrirEdicao : undefined}
        />
      </CardContent>

      {alvo && (
        <FamiliaDrawer
          membroId={alvo.membroId}
          entidadeId={alvo.entidadeId}
          nome={alvo.nome}
          open={!!alvo}
          onOpenChange={(v) => !v && setAlvo(null)}
        />
      )}
    </Card>
  );
}
