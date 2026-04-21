"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EventoForm } from "@features/calendario/components/EventoForm";
import { EventoCard } from "@features/calendario/components/EventoCard";
import type { EventoFormValues } from "@features/calendario/lib/validations";

function getMonthRange(year: number, month: number) {
  const dataInicio = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dataFim = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { dataInicio, dataFim };
}

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function CalendarioPage() {
  const { can } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filtroMinisterio, setFiltroMinisterio] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvento, setEditEvento] = useState<any>(null);

  const { dataInicio, dataFim } = useMemo(() => getMonthRange(year, month), [year, month]);

  const queryArgs = useMemo(() => {
    const args: any = { dataInicio, dataFim };
    if (filtroMinisterio) args.ministerioId = filtroMinisterio;
    return args;
  }, [dataInicio, dataFim, filtroMinisterio]);

  // @ts-ignore Convex TS2589
  const eventos = useQuery(api.calendario.queries.list, queryArgs);
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, { status: "ATIVO" });
  const createEvento = useMutation(api.calendario.mutations.create);
  const updateEvento = useMutation(api.calendario.mutations.update);
  const removeEvento = useMutation(api.calendario.mutations.remove);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleCreate = async (data: EventoFormValues) => {
    try {
      await createEvento({
        titulo: data.titulo,
        data: data.data,
        dataFim: data.dataFim || undefined,
        ministerioId: data.ministerioId
          ? (data.ministerioId as Id<"ministerios">)
          : undefined,
        descricao: data.descricao || undefined,
      });
      toast.success("Evento criado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar evento");
    }
  };

  const handleUpdate = async (data: EventoFormValues) => {
    if (!editEvento) return;
    try {
      await updateEvento({
        id: editEvento._id as Id<"calendarioEventos">,
        titulo: data.titulo,
        data: data.data,
        dataFim: data.dataFim || undefined,
        ministerioId: data.ministerioId
          ? (data.ministerioId as Id<"ministerios">)
          : undefined,
        descricao: data.descricao || undefined,
      });
      toast.success("Evento atualizado");
      setEditEvento(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  };

  const handleRemove = async (id: Id<"calendarioEventos">) => {
    if (!confirm("Excluir este evento?")) return;
    try {
      await removeEvento({ id });
      toast.success("Evento excluido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  return (
    <ModuloGuard modulo="calendario">
      <HeaderLayout>
      <div className="space-y-4">
        <PageHeader title="Calendario" />
        <div className="flex items-center justify-end">
          <PermissionGate permission="calendario:create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </PermissionGate>
        </div>

        {/* Navegacao de mes + filtro */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {MESES[month]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={filtroMinisterio}
            onValueChange={(val) => setFiltroMinisterio(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os ministerios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {ministerios?.map((m: any) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de eventos */}
        {eventos === undefined ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento neste periodo
          </p>
        ) : (
          <div className="space-y-2">
            {eventos.map((evento: any) => (
              <div key={evento._id} className="relative group">
                <EventoCard
                  evento={evento}
                  onClick={can("calendario:update") ? () => setEditEvento(evento) : undefined}
                />
                {can("calendario:delete") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(evento._id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dialog: Criar evento */}
        <EventoForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
        />

        {/* Dialog: Editar evento */}
        {editEvento && (
          <EventoForm
            open={!!editEvento}
            onOpenChange={(open) => !open && setEditEvento(null)}
            onSubmit={handleUpdate}
            isEditing
            defaultValues={{
              titulo: editEvento.titulo,
              data: editEvento.data,
              dataFim: editEvento.dataFim || "",
              ministerioId: editEvento.ministerioId || "",
              descricao: editEvento.descricao || "",
            }}
          />
        )}
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
