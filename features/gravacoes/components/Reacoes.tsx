"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";

const REACTION_TYPES = ["❤️", "🙏", "🔥", "👏", "💡"];

interface ReacoesProps {
  gravacaoId: Id<"gravacoes">;
}

export function Reacoes({ gravacaoId }: ReacoesProps) {
  const reacoes = useQuery(api.gravacoes.comentarios.listReacoes, { gravacaoId });
  const toggleReacao = useMutation(api.gravacoes.comentarios.toggleReacao);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTION_TYPES.map((tipo) => {
        const data = reacoes?.find((r: any) => r.tipo === tipo);
        const count = data?.count ?? 0;
        const mine = data?.mine ?? false;

        return (
          <Button
            key={tipo}
            variant={mine ? "default" : "outline"}
            size="sm"
            className="h-8 px-2.5 gap-1 text-sm"
            onClick={() => toggleReacao({ gravacaoId, tipo })}
          >
            <span>{tipo}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </Button>
        );
      })}
    </div>
  );
}
