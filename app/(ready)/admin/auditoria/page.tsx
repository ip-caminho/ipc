"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import { History, Filter, X } from "lucide-react";

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

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium flex items-center gap-2">
            <History className="h-6 w-6" />
            Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logs de alterações no sistema
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
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
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="tabela" className="text-xs">Tabela</Label>
            <Select value={tabela || "__all"} onValueChange={(v) => setTabela(v === "__all" ? "" : v)}>
              <SelectTrigger id="tabela">
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
            <Label htmlFor="acao" className="text-xs">Ação</Label>
            <Input
              id="acao"
              placeholder="Ex: create, update, delete"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="de" className="text-xs">De</Label>
            <Input
              id="de"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ate" className="text-xs">Até</Label>
            <Input
              id="ate"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
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
                    {format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
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
              onClick={() => setLimit(limit + PAGE_SIZE)}
            >
              Carregar mais
            </Button>
          </div>
        )}
      </div>

      {/* Drawer de detalhe */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
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
