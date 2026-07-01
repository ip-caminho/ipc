"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { EventoForm } from "@features/calendario/components/EventoForm";
import type { EventoFormValues } from "@features/calendario/lib/validations";
import { revalidarSite } from "@features/site-publico/lib/revalidate";

type EventoEditavel = {
  id: string;
  titulo: string;
  data: string;
  dataFim?: string;
  ministerioId?: string;
  descricao?: string;
  tipo: string;
  publicadoNoSite: boolean;
  exibirNoSiteDe?: string;
  exibirNoSiteAte?: string;
};

type StatusSite = "visivel" | "oculto" | "agendado" | "expirado";

type AgendaItem = {
  id: string;
  tipo: string;
  titulo: string;
  subtitulo?: string;
  data: string;
  horario?: string;
  editavel: boolean;
  publicadoNoSite?: boolean;
  statusSite?: StatusSite;
  evento?: EventoEditavel;
};

const TIPO_LABEL: Record<string, string> = {
  culto: "Culto",
  pg: "Pequeno Grupo",
  evento: "Evento",
  reuniao: "Reunião",
};

const STATUS_SITE_LABEL: Record<Exclude<StatusSite, "visivel">, string> = {
  oculto: "Oculto no site",
  agendado: "Agendado",
  expirado: "Expirado",
};

function formatDataBR(data: string): string {
  const [, m, d] = data.split("-");
  return d && m ? `${d}/${m}` : data;
}

// Painel "Agenda" do hub do site público. Cultos publicados (leitura) + eventos
// do calendário (editáveis inline via EventoForm). Sem chrome de página.
export function AgendaPanel() {
  // @ts-ignore Convex TS2589
  const agenda = useQuery(api.site.queries.getAgendaAdmin) as AgendaItem[] | undefined;
  // @ts-ignore Convex TS2589
  const createEvento = useMutation(api.calendario.mutations.create);
  // @ts-ignore Convex TS2589
  const updateEvento = useMutation(api.calendario.mutations.update);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventoEditavel | null>(null);

  function novoEvento() {
    setEditing(null);
    setFormOpen(true);
  }
  function editarEvento(ev: EventoEditavel) {
    setEditing(ev);
    setFormOpen(true);
  }

  const handleSubmit = async (data: EventoFormValues) => {
    try {
      if (editing) {
        await updateEvento({
          id: editing.id as Id<"calendarioEventos">,
          titulo: data.titulo,
          data: data.data,
          dataFim: data.dataFim || undefined,
          ministerioId: data.ministerioId ? (data.ministerioId as Id<"ministerios">) : undefined,
          descricao: data.descricao || undefined,
          tipo: data.tipo,
          publicadoNoSite: data.publicadoNoSite ?? true,
          exibirNoSiteDe: data.exibirNoSiteDe || undefined,
          exibirNoSiteAte: data.exibirNoSiteAte || undefined,
        });
        await revalidarSite("agenda");
        toast.success("Evento atualizado");
      } else {
        await createEvento({
          titulo: data.titulo,
          data: data.data,
          dataFim: data.dataFim || undefined,
          ministerioId: data.ministerioId ? (data.ministerioId as Id<"ministerios">) : undefined,
          descricao: data.descricao || undefined,
          tipo: data.tipo,
          publicadoNoSite: data.publicadoNoSite ?? true,
          exibirNoSiteDe: data.exibirNoSiteDe || undefined,
          exibirNoSiteAte: data.exibirNoSiteAte || undefined,
        });
        await revalidarSite("agenda");
        toast.success("Evento criado");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar evento");
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        A agenda pública combina os cultos publicados (geridos em{" "}
        <Link href="/cultos" className="underline">
          Cultos
        </Link>
        ) e os eventos do calendário. O culto de domingo às 10h aparece automaticamente no
        site.
      </p>
      <div className="flex justify-end">
        <Button onClick={novoEvento}>
          <Plus className="mr-1 h-4 w-4" /> Novo evento
        </Button>
      </div>
      {agenda === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : agenda.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum culto publicado nem evento futuro.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-md border">
          {agenda.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-3">
              <div className="w-16 shrink-0 text-sm text-muted-foreground">
                {formatDataBR(e.data)}
                {e.horario ? ` · ${e.horario}` : ""}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{e.titulo}</p>
                {e.subtitulo && <p className="text-xs text-muted-foreground">{e.subtitulo}</p>}
              </div>
              <Badge variant="secondary">{TIPO_LABEL[e.tipo] ?? e.tipo}</Badge>
              {e.editavel && e.statusSite && e.statusSite !== "visivel" && (
                <Badge variant="outline" className="text-muted-foreground">
                  {STATUS_SITE_LABEL[e.statusSite]}
                </Badge>
              )}
              {e.editavel && e.evento ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-muted-foreground"
                  onClick={() => editarEvento(e.evento!)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              ) : (
                <Link href="/cultos" className="text-xs text-muted-foreground underline">
                  gerir em Cultos
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      <EventoForm
        key={editing?.id ?? "novo"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isEditing={!!editing}
        defaultValues={
          editing
            ? {
                titulo: editing.titulo,
                data: editing.data,
                dataFim: editing.dataFim ?? "",
                ministerioId: editing.ministerioId ?? "",
                descricao: editing.descricao ?? "",
                tipo: (editing.tipo === "pg" || editing.tipo === "reuniao"
                  ? editing.tipo
                  : "evento") as "evento" | "pg" | "reuniao",
                publicadoNoSite: editing.publicadoNoSite,
                exibirNoSiteDe: editing.exibirNoSiteDe ?? "",
                exibirNoSiteAte: editing.exibirNoSiteAte ?? "",
              }
            : undefined
        }
      />
    </div>
  );
}
