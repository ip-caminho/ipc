"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DatePickerBR } from "@/shared/components/ui/date-picker-br";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Filter, X, ChevronRight } from "lucide-react";

const PAGE_SIZE = 100;

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function AuditoriaContent() {
  const [tabela, setTabela] = useQueryState("tabela", parseAsString.withDefault(""));
  const [dataInicio, setDataInicio] = useQueryState("de", parseAsString.withDefault(""));
  const [dataFim, setDataFim] = useQueryState("ate", parseAsString.withDefault(""));
  const [actionFilter, setActionFilter] = useQueryState("acao", parseAsString.withDefault(""));
  const [limit, setLimit] = useQueryState("limit", parseAsInteger.withDefault(PAGE_SIZE));

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // @ts-ignore Convex TS2589
  const tabelas = useQuery(api.audit.queries.listTabelas);

  const queryArgs = useMemo(() => {
    const args: any = { limit };
    if (tabela) args.tabela = tabela;
    if (actionFilter) args.action = actionFilter;
    if (dataInicio) {
      const d = new Date(dataInicio);
      if (!isNaN(d.getTime())) args.dataInicio = d.getTime();
    }
    if (dataFim) {
      const d = new Date(dataFim);
      if (!isNaN(d.getTime())) {
        // incluir o dia inteiro
        d.setHours(23, 59, 59, 999);
        args.dataFim = d.getTime();
      }
    }
    return args;
  }, [limit, tabela, actionFilter, dataInicio, dataFim]);

  // @ts-ignore Convex TS2589
  const result = useQuery(api.audit.queries.listFiltered, queryArgs);
  const logs = result?.logs ?? [];
  const hasMore = result?.hasMore ?? false;
  const isLoading = result === undefined;

  const temFiltros = !!(tabela || dataInicio || dataFim || actionFilter);

  const clearFilters = () => {
    setTabela("");
    setDataInicio("");
    setDataFim("");
    setActionFilter("");
    setLimit(PAGE_SIZE);
  };

  const nFiltros = [tabela, dataInicio, dataFim, actionFilter].filter(Boolean).length;

  const renderCampos = (prefix: string) => (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor={`${prefix}tabela`} className="text-xs">Tabela</Label>
            <Select value={tabela || "__all"} onValueChange={(v) => setTabela(v === "__all" ? "" : v)}>
              <SelectTrigger className="h-11 md:h-9" id={`${prefix}tabela`}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                {tabelas?.map((t: string) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}acao`} className="text-xs">Ação</Label>
            <Input
              id={`${prefix}acao`}
              className="h-11 md:h-9"
              placeholder="Ex: create, update, delete"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}de`} className="text-xs">De</Label>
            <DatePickerBR
              id={`${prefix}de`}
              className="h-11 md:h-9"
              value={dataInicio}
              onChange={(iso) => setDataInicio(iso)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefix}ate`} className="text-xs">Até</Label>
            <DatePickerBR
              id={`${prefix}ate`}
              className="h-11 md:h-9"
              value={dataFim}
              onChange={(iso) => setDataFim(iso)}
            />
          </div>
        </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <PageHeader title="Auditoria" subtitle="Logs de alterações no sistema" />

      {/* Filtros: mobile = botao + chips ativos (campos no Drawer) */}
      <div className="space-y-2 md:hidden">
        <Button variant="outline" className="h-11 w-full" onClick={() => setFiltersOpen(true)}>
          <Filter className="mr-2 h-4 w-4" />
          Filtros{nFiltros > 0 ? ` (${nFiltros})` : ""}
        </Button>
        {temFiltros && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabela && <Button variant="secondary" className="h-10 shrink-0 rounded-full px-4 text-sm" onClick={() => setTabela("")}>Tabela: {tabela} <X className="ml-1 h-4 w-4" /></Button>}
          {actionFilter && <Button variant="secondary" className="h-10 shrink-0 rounded-full px-4 text-sm" onClick={() => setActionFilter("")}>Ação: {actionFilter} <X className="ml-1 h-4 w-4" /></Button>}
          {dataInicio && <Button variant="secondary" className="h-10 shrink-0 rounded-full px-4 text-sm" onClick={() => setDataInicio("")}>De: {dataInicio} <X className="ml-1 h-4 w-4" /></Button>}
          {dataFim && <Button variant="secondary" className="h-10 shrink-0 rounded-full px-4 text-sm" onClick={() => setDataFim("")}>Até: {dataFim} <X className="ml-1 h-4 w-4" /></Button>}
          </div>
        )}
      </div>

      {/* Filtros: desktop */}
      <div className="hidden space-y-4 rounded-xl border bg-card p-4 md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          {temFiltros && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        {renderCampos("d-")}
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader>
            <DrawerTitle>Filtros</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">{renderCampos("m-")}</div>
          <DrawerFooter className="pb-safe">
            <DrawerClose asChild>
              <Button className="h-11">Ver resultados</Button>
            </DrawerClose>
            {temFiltros && (
              <Button variant="outline" className="h-11" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="md:hidden">
          {isLoading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          )}
          {!isLoading && logs.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado</p>
          )}
          {logs.map((log: any) => (
            <button
              key={log._id}
              type="button"
              onClick={() => setSelectedLog(log)}
              className="flex min-h-14 w-full items-center gap-2 border-b p-3 text-left last:border-0 active:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })} · {log.autorNome || "—"}
                </p>
                <p className="truncate text-sm font-medium">
                  {String(log.action).toUpperCase()} · {log.referenciaTabela}
                  {log.field ? `.${log.field}` : ""}
                </p>
                {log.field && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {`${formatValue(log.from)} → ${formatValue(log.to)}`}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="hidden md:block md:overflow-auto md:max-h-[calc(100vh-16rem)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-muted">
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Quando</th>
                <th className="text-left px-4 py-3 font-medium">Autor</th>
                <th className="text-left px-4 py-3 font-medium">Ação</th>
                <th className="text-left px-4 py-3 font-medium">Tabela</th>
                <th className="text-left px-4 py-3 font-medium">Campo</th>
                <th className="text-left px-4 py-3 font-medium">De → Para</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
              {logs.map((log: any) => (
                <tr
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">{log.autorNome || "—"}</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.referenciaTabela}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.field || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {log.field ? `${formatValue(log.from)} → ${formatValue(log.to)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="border-t p-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-11 md:w-auto md:h-8"
              onClick={() => setLimit(limit + PAGE_SIZE)}
            >
              Carregar mais
            </Button>
          </div>
        )}
      </div>

      {/* Detalhe: Drawer no mobile, Sheet lateral no desktop */}
      <Drawer open={isMobile && !!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Detalhe do log</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Quando</p>
                <p>{format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Autor</p>
                <p>{selectedLog.autorNome || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Ação</p>
                <p className="font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Referência</p>
                <p>{selectedLog.referenciaTabela} · {selectedLog.referenciaId}</p>
              </div>
              {selectedLog.field && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Campo alterado</p>
                  <p className="font-medium">{selectedLog.field}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">De</p>
                      <pre className="text-xs whitespace-pre-wrap break-all">{formatValue(selectedLog.from)}</pre>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Para</p>
                      <pre className="text-xs whitespace-pre-wrap break-all">{formatValue(selectedLog.to)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </DrawerContent>
      </Drawer>
      <Sheet open={!isMobile && !!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhe do log</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Quando</p>
                <p>{format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Autor</p>
                <p>{selectedLog.autorNome || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Ação</p>
                <p className="font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Referência</p>
                <p>{selectedLog.referenciaTabela} · {selectedLog.referenciaId}</p>
              </div>
              {selectedLog.field && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Campo alterado</p>
                  <p className="font-medium">{selectedLog.field}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">De</p>
                      <pre className="text-xs whitespace-pre-wrap break-all">{formatValue(selectedLog.from)}</pre>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Para</p>
                      <pre className="text-xs whitespace-pre-wrap break-all">{formatValue(selectedLog.to)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function AuditoriaPage() {
  return (
    <PermissionGate
      permission="audit:read"
      fallback={
        <div className="max-w-md mx-auto text-center pt-12">
          <h1 className="text-xl font-medium">Sem acesso</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Você não tem permissão para visualizar a auditoria.
          </p>
        </div>
      }
    >
      <AuditoriaContent />
    </PermissionGate>
  );
}
