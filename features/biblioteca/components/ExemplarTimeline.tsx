"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BookPlus, Gift, ArrowRight, ArrowLeft, AlertCircle, FileText } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const TIPO_ICONS: Record<string, { icon: any; color: string }> = {
  CADASTRO: { icon: BookPlus, color: "text-blue-500" },
  DOACAO: { icon: Gift, color: "text-green-500" },
  EMPRESTIMO: { icon: ArrowRight, color: "text-orange-500" },
  DEVOLUCAO: { icon: ArrowLeft, color: "text-emerald-500" },
  PERDA: { icon: AlertCircle, color: "text-red-500" },
  CONDICAO: { icon: AlertCircle, color: "text-yellow-500" },
  OBSERVACAO: { icon: FileText, color: "text-gray-500" },
};

function formatDateBR(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function ExemplarTimeline({ exemplarId }: { exemplarId: Id<"exemplares"> }) {
  const eventos = useQuery(api.biblioteca.queries.listEventos, { exemplarId });

  if (!eventos) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem eventos registrados</p>;
  }

  const ordenados = [...eventos].sort((a, b) => b._creationTime - a._creationTime);

  return (
    <div className="space-y-3">
      {ordenados.map((e) => {
        const config = TIPO_ICONS[e.tipo] || TIPO_ICONS.OBSERVACAO;
        const Icon = config.icon;
        return (
          <div key={e._id} className="flex gap-3">
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{e.descricao}</p>
              <p className="text-xs text-muted-foreground">{formatDateBR(e.data)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
