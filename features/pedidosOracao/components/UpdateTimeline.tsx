"use client";

import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@shared/lib/utils/cn";

export type UpdateTipo = "ATUALIZACAO" | "REFORCO" | "TESTEMUNHO";

export interface UpdateItem {
  _id: string;
  texto: string;
  tipo: UpdateTipo;
  criadoEm: number;
  autorNome: string;
  autorFoto: string | null;
}

const TIPO_META: Record<UpdateTipo, { label: string; dot: string; text: string }> = {
  ATUALIZACAO: {
    label: "Atualização",
    dot: "bg-blue-500 dark:bg-blue-400",
    text: "text-blue-600 dark:text-blue-400",
  },
  REFORCO: {
    label: "Pedido continua",
    dot: "bg-amber-500 dark:bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
  },
  TESTEMUNHO: {
    label: "Testemunho",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-400",
  },
};

function timeAgo(ts: number): string {
  try {
    return formatDistanceToNow(fromUnixTime(ts / 1000), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "";
  }
}

export function UpdateTimeline({ updates }: { updates: UpdateItem[] }) {
  if (updates.length === 0) return null;

  return (
    <ol className="relative border-l border-border ml-1 flex flex-col gap-5">
      {updates.map((u) => {
        const meta = TIPO_META[u.tipo];
        return (
          <li key={u._id} className="pl-5">
            <span
              className={cn(
                "absolute -left-1.5 mt-1 h-3 w-3 rounded-full ring-2 ring-background",
                meta.dot,
              )}
              aria-hidden
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-[9px] font-semibold tracking-wider uppercase",
                  meta.text,
                )}
              >
                {meta.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(u.criadoEm)}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground mt-1 whitespace-pre-wrap">
              {u.texto}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
