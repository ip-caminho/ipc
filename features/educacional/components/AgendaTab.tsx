"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { CalendarDays, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@shared/providers/PermissionsProvider";

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
        <p className="text-sm text-muted-foreground">
          {historico ? "Nenhum evento no historico" : "Nenhum evento proximo"}
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((e) => (
            <Card key={e._id}>
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{e.titulo}</p>
                      {e.tipo && (
                        <Badge variant="outline">{TIPO_LABEL[e.tipo] || e.tipo}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(e.data), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      {e.dataFim && e.dataFim !== e.data
                        ? ` ate ${format(parseISO(e.dataFim), "dd/MM/yyyy", { locale: ptBR })}`
                        : ""}
                    </p>
                    {e.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {e.descricao}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
