"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { CalendarDays, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { EduEmptyState } from "./EduEmptyState";

interface AgendaTabProps {
  ministerioId?: Id<"ministerios">;
}

const TIPO_LABEL: Record<string, string> = {
  pg: "PG",
  evento: "Evento",
  reuniao: "Reuniao",
};

export function AgendaTab({ ministerioId }: AgendaTabProps) {
  const { can } = useAuth();
  const [historico, setHistorico] = useState(false);

  // @ts-ignore Convex TS2589
  const eventos = useQuery(api.educacional.queries.listAgendaEducacional, ministerioId ? { ministerioId, incluirPassados: historico } : "skip");

  if (!ministerioId) {
    return (
      <p className="text-sm text-muted-foreground">
        Ministerio &quot;Educacional&quot; nao encontrado. Crie-o em Ministerios para usar a agenda.
      </p>
    );
  }

  // No modo historico, mostra os mais recentes primeiro.
  const lista = eventos
    ? historico
      ? [...eventos].sort((a, b) => b.data.localeCompare(a.data))
      : eventos
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button
            variant={!historico ? "default" : "outline"}
            size="sm"
            onClick={() => setHistorico(false)}
          >
            Proximos
          </Button>
          <Button
            variant={historico ? "default" : "outline"}
            size="sm"
            onClick={() => setHistorico(true)}
          >
            Historico
          </Button>
        </div>
        {can("calendario:read") && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/calendario">
              <ExternalLink className="h-4 w-4 mr-1" />
              Calendario geral
            </Link>
          </Button>
        )}
      </div>

      {lista === undefined ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : lista.length === 0 ? (
        <EduEmptyState
          icon={CalendarDays}
          title={historico ? "Sem historico" : "Nenhum evento proximo"}
          description="Eventos do departamento aparecem aqui quando vinculados ao ministerio Educacional no calendario."
        />
      ) : (
        <div className="space-y-0">
          {lista.map((e, i) => (
            <div key={e._id} className="flex gap-3">
              {/* Coluna do marcador + linha conectora da timeline */}
              <div className="flex flex-col items-center">
                <div className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                {i < lista.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <p className="text-xs font-medium text-primary">
                  {format(parseISO(e.data), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                  {e.dataFim && e.dataFim !== e.data
                    ? ` ate ${format(parseISO(e.dataFim), "dd/MM/yyyy", { locale: ptBR })}`
                    : ""}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-sm font-medium">{e.titulo}</p>
                  {e.tipo && (
                    <Badge variant="outline">{TIPO_LABEL[e.tipo] || e.tipo}</Badge>
                  )}
                </div>
                {e.descricao && (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                    {e.descricao}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
