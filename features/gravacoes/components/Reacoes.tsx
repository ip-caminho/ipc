"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@shared/lib/utils/cn";

const REACTION_TYPES = ["❤️", "🙏", "🔥", "👏", "💡"];

interface ReacoesProps {
  gravacaoId: Id<"gravacoes">;
}

export function Reacoes({ gravacaoId }: ReacoesProps) {
  const reacoes = useQuery(api.gravacoes.comentarios.listReacoes, { gravacaoId });
  const toggleReacao = useMutation(api.gravacoes.comentarios.toggleReacao);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTION_TYPES.map((tipo) => {
        const data = reacoes?.find((r: any) => r.tipo === tipo);
        const count = data?.count ?? 0;
        const mine = data?.mine ?? false;

        return (
          <button
            key={tipo}
            type="button"
            onClick={() => toggleReacao({ gravacaoId, tipo })}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors duration-150 cursor-pointer",
              mine
                ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-border hover:bg-muted",
            )}
          >
            <span className="text-base">{tipo}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
