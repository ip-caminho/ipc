"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";

export function UltimoSermaoCard() {
  const { can } = useAuth();
  // listRecentesByTipo ja filtra PUBLICADO e ordena por data desc — evita
  // baixar a tabela inteira para mostrar 1 card
  const sermoes = useQuery(
    api.gravacoes.queries.listRecentesByTipo,
    can("gravacoes:read")
      ? { tipo: "SERMAO", limit: 1 }
      : "skip",
  );

  if (!sermoes || sermoes.length === 0) return null;

  type Gravacao = (typeof sermoes)[number] & {
    pregadorInfo?: { nome: string } | null;
    pregadorNome?: string | null;
  };

  const ultimo = sermoes[0] as Gravacao;
  const pregador = ultimo.pregadorInfo?.nome || ultimo.pregadorNome || null;

  let dataFormatada = "";
  try {
    dataFormatada = format(parseISO(ultimo.data), "d 'de' MMMM", { locale: ptBR });
  } catch {
    dataFormatada = "";
  }

  return (
    <Link
      href={`/gravacoes/${ultimo._id}`}
      className="flex items-center gap-3 rounded-xl bg-secondary p-4 active:bg-secondary/80 transition-colors"
    >
      <div className="shrink-0 h-10 w-10 rounded-lg bg-foreground/10 flex items-center justify-center">
        <Play className="h-4 w-4 text-foreground" fill="currentColor" strokeWidth={0} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
          Ultimo sermao
        </p>
        <p className="text-sm font-medium truncate mt-0.5">
          {ultimo.titulo}
        </p>
        {(pregador || dataFormatada) && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {[pregador, dataFormatada].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
