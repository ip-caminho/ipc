"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EventoForm } from "@features/calendario/components/EventoForm";
import type { EventoFormValues } from "@features/calendario/lib/validations";

const TIPO_LABEL: Record<string, string> = {
  culto: "Culto",
  pg: "Pequeno Grupo",
  evento: "Evento",
  reuniao: "Reunião",
};

function formatDataBR(data: string): string {
  const [, m, d] = data.split("-");
  return d && m ? `${d}/${m}` : data;
}

function AgendaAdmin() {
  // @ts-ignore Convex TS2589
  const agenda = useQuery(api.public.agenda.list, {});
  // @ts-ignore Convex TS2589
  const createEvento = useMutation(api.calendario.mutations.create);
  const [formOpen, setFormOpen] = useState(false);

  const handleCreate = async (data: EventoFormValues) => {
    try {
      await createEvento({
        titulo: data.titulo,
        data: data.data,
        dataFim: data.dataFim || undefined,
        ministerioId: data.ministerioId ? (data.ministerioId as Id<"ministerios">) : undefined,
        descricao: data.descricao || undefined,
        tipo: data.tipo,
      });
      toast.success("Evento criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar evento");
    }
  };

  return (
    <HeaderLayout>
      <PageHeader title="Agenda do site" />
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-muted-foreground">
          A agenda pública combina os cultos publicados (gerenciados em{" "}
          <Link href="/cultos" className="underline">
            Cultos
          </Link>
          ) e os eventos do calendário. O culto de domingo às 10h aparece automaticamente.
        </p>
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
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
              Nenhum evento futuro.
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y rounded-md border">
            {agenda.map((e: { id: string; titulo: string; subtitulo?: string; data: string; horario?: string; tipo: string }) => (
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
                {e.tipo === "culto" ? (
                  <Link href="/cultos" className="text-xs text-muted-foreground underline">
                    gerir
                  </Link>
                ) : (
                  <Link href="/calendario" className="text-xs text-muted-foreground underline">
                    editar
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <EventoForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} />
    </HeaderLayout>
  );
}

export default function AgendaSitePage() {
  return (
    <PermissionGate
      permission="site_publico:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <AgendaAdmin />
    </PermissionGate>
  );
}
