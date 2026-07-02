"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addWeeks,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@shared/components/auth/SemPermissaoFallback";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { EventoForm } from "@features/calendario/components/EventoForm";
import { CalendarioMes } from "@features/calendario/components/CalendarioMes";
import { CalendarioSemana } from "@features/calendario/components/CalendarioSemana";
import { CalendarioLista } from "@features/calendario/components/CalendarioLista";
import type { EventoFormValues } from "@features/calendario/lib/validations";
import type { CalendarioEvento } from "@features/calendario/lib/types";
import { revalidarSite } from "@features/site-publico/lib/revalidate";

const VIEWS = ["mes", "semana", "lista"] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABEL: Record<View, string> = { mes: "Mês", semana: "Semana", lista: "Lista" };

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CalendarioContent() {
  const { can } = useAuth();
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWS).withDefault("mes"),
  );
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [filtroMinisterio, setFiltroMinisterio] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<string>("");
  const [editEvento, setEditEvento] = useState<CalendarioEvento | null>(null);

  // Intervalo de datas a carregar conforme a visão.
  const { inicio, fim } = useMemo(() => {
    if (view === "semana") {
      return {
        inicio: startOfWeek(refDate, { weekStartsOn: 0 }),
        fim: endOfWeek(refDate, { weekStartsOn: 0 }),
      };
    }
    if (view === "mes") {
      return {
        inicio: startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 }),
        fim: endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 }),
      };
    }
    return { inicio: startOfMonth(refDate), fim: endOfMonth(refDate) };
  }, [view, refDate]);

  const queryArgs = useMemo(() => {
    const args: { dataInicio: string; dataFim: string; ministerioId?: Id<"ministerios"> } = {
      dataInicio: format(inicio, "yyyy-MM-dd"),
      dataFim: format(fim, "yyyy-MM-dd"),
    };
    if (filtroMinisterio) args.ministerioId = filtroMinisterio as Id<"ministerios">;
    return args;
  }, [inicio, fim, filtroMinisterio]);

  // @ts-ignore Convex TS2589
  const eventos = useQuery(api.calendario.queries.list, queryArgs) as
    | CalendarioEvento[]
    | undefined;
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, { status: "ATIVO" });
  // @ts-ignore Convex TS2589
  const createEvento = useMutation(api.calendario.mutations.create);
  // @ts-ignore Convex TS2589
  const updateEvento = useMutation(api.calendario.mutations.update);
  // @ts-ignore Convex TS2589
  const removeEvento = useMutation(api.calendario.mutations.remove);

  const navegar = (dir: 1 | -1) =>
    setRefDate((d) => (view === "semana" ? addWeeks(d, dir) : addMonths(d, dir)));

  const periodoLabel =
    view === "semana"
      ? `${format(inicio, "d", { locale: ptBR })}–${format(fim, "d 'de' MMM yyyy", { locale: ptBR })}`
      : capitalizar(format(refDate, "MMMM yyyy", { locale: ptBR }));

  const abrirNovo = (iso?: string) => {
    if (!can("calendario:create")) return;
    setCreateData(iso ?? "");
    setCreateOpen(true);
  };

  const abrirEvento = (ev: CalendarioEvento) => {
    if (can("calendario:update")) setEditEvento(ev);
  };

  const handleCreate = async (data: EventoFormValues) => {
    try {
      await createEvento({
        titulo: data.titulo,
        data: data.data,
        dataFim: data.dataFim || undefined,
        ministerioId: data.ministerioId ? (data.ministerioId as Id<"ministerios">) : undefined,
        descricao: data.descricao || undefined,
        tipo: data.tipo,
        publicadoNoSite: data.publicadoNoSite ?? false,
        exibirNoSiteDe: data.exibirNoSiteDe || undefined,
        exibirNoSiteAte: data.exibirNoSiteAte || undefined,
      });
      await revalidarSite("agenda");
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
        ministerioId: data.ministerioId ? (data.ministerioId as Id<"ministerios">) : undefined,
        descricao: data.descricao || undefined,
        tipo: data.tipo,
        publicadoNoSite: data.publicadoNoSite ?? false,
        exibirNoSiteDe: data.exibirNoSiteDe || undefined,
        exibirNoSiteAte: data.exibirNoSiteAte || undefined,
      });
      await revalidarSite("agenda");
      toast.success("Evento atualizado");
      setEditEvento(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  };

  // Exclusão a partir do EventoForm (o form já confirma e fecha o dialog).
  const handleDeleteFromForm = async () => {
    if (!editEvento) return;
    try {
      await removeEvento({ id: editEvento._id as Id<"calendarioEventos"> });
      await revalidarSite("agenda");
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

          {/* Barra: navegação + período */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navegar(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navegar(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRefDate(new Date())}>
                Hoje
              </Button>
              <span className="ml-2 text-lg font-semibold tracking-tight">{periodoLabel}</span>
            </div>

            {/* Seletor de visão */}
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={view}
              onValueChange={(v) => {
                if (v) setView(v as View);
              }}
            >
              {VIEWS.map((v) => (
                <ToggleGroupItem key={v} value={v} className="px-3">
                  {VIEW_LABEL[v]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Barra: filtro + novo */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select
              value={filtroMinisterio || "__all__"}
              onValueChange={(val) => setFiltroMinisterio(val === "__all__" ? "" : val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os ministerios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os ministérios</SelectItem>
                {ministerios?.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <PermissionGate permission="calendario:create">
              <Button onClick={() => abrirNovo()}>
                <Plus className="mr-1 h-4 w-4" /> Novo evento
              </Button>
            </PermissionGate>
          </div>

          {/* Conteúdo da visão */}
          {eventos === undefined ? (
            <Skeleton className="h-64 w-full" />
          ) : view === "mes" ? (
            <CalendarioMes
              refDate={refDate}
              eventos={eventos}
              selecionado={diaSel}
              onSelect={setDiaSel}
              onDayClick={abrirNovo}
              onEventClick={abrirEvento}
              onNavigate={setRefDate}
              podeCriar={can("calendario:create")}
            />
          ) : view === "semana" ? (
            <CalendarioSemana
              refDate={refDate}
              eventos={eventos}
              onDayClick={abrirNovo}
              onEventClick={abrirEvento}
            />
          ) : (
            <CalendarioLista refDate={refDate} eventos={eventos} onEventClick={abrirEvento} />
          )}

          {/* Dialog: criar evento */}
          <EventoForm
            key={createData || "novo"}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreate}
            defaultValues={createData ? { data: createData } : undefined}
          />

          {/* Dialog: editar evento */}
          {editEvento && (
            <EventoForm
              open={!!editEvento}
              onOpenChange={(open) => !open && setEditEvento(null)}
              onSubmit={handleUpdate}
              isEditing
              onDelete={handleDeleteFromForm}
              defaultValues={{
                titulo: editEvento.titulo,
                data: editEvento.data,
                dataFim: editEvento.dataFim || "",
                ministerioId: editEvento.ministerioId || "",
                descricao: editEvento.descricao || "",
                tipo: editEvento.tipo ?? "evento",
                publicadoNoSite: editEvento.publicadoNoSite ?? true,
                exibirNoSiteDe: editEvento.exibirNoSiteDe ?? "",
                exibirNoSiteAte: editEvento.exibirNoSiteAte ?? "",
              }}
            />
          )}
        </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}

export default function CalendarioPage() {
  return (
    <PermissionGate permission="calendario:read" fallback={<SemPermissaoFallback />}>
      <CalendarioContent />
    </PermissionGate>
  );
}
