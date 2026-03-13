"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Plus, Search, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortMode = "data" | "pregador";

function GravacaoCard({ g, showStatus }: { g: any; showStatus?: boolean }) {
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;

  return (
    <Link href={`/gravacoes/${g._id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium leading-tight">{g.titulo}</h3>
            {showStatus && (
              <Badge variant={g.status === "PUBLICADO" ? "default" : "secondary"} className="text-xs shrink-0">
                {g.status === "PUBLICADO" ? "Publicado" : "Rascunho"}
              </Badge>
            )}
          </div>
          <table className="text-sm text-muted-foreground">
            <tbody>
              <tr>
                <td className="font-medium text-foreground/70 pr-4 align-top whitespace-nowrap">Data:</td>
                <td>{format(parseISO(g.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</td>
              </tr>
              {pregador && (
                <tr>
                  <td className="font-medium text-foreground/70 pr-4 align-top whitespace-nowrap">Pregador:</td>
                  <td>{pregador}</td>
                </tr>
              )}
              {g.textoBase && (
                <tr>
                  <td className="font-medium text-foreground/70 pr-4 align-top whitespace-nowrap">Passagem:</td>
                  <td>{g.textoBase}</td>
                </tr>
              )}
            </tbody>
          </table>
          {g.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-3">{g.descricao}</p>
          )}
          {g.serieInfo && (
            <Badge variant="outline" className="text-xs">{g.serieInfo.nome}</Badge>
          )}
          {((g.reacoesSummary && g.reacoesSummary.length > 0) || g.comentarioCount > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              {g.reacoesSummary?.map((r: any) => (
                <span key={r.tipo}>{r.tipo} {r.count}</span>
              ))}
              {g.comentarioCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {g.comentarioCount}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function GravacoesList({ gravacoes, showStatus, sortMode }: { gravacoes: any[]; showStatus?: boolean; sortMode: SortMode }) {
  const grouped = useMemo(() => {
    if (sortMode === "pregador") {
      const map: Record<string, any[]> = {};
      for (const g of gravacoes) {
        const key = g.pregadorNome || g.pregadorInfo?.nome || "Pregador nao informado";
        if (!map[key]) map[key] = [];
        map[key].push(g);
      }
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }

    // Por data — agrupa por mes/ano
    const map: Record<string, { label: string; items: any[] }> = {};
    for (const g of gravacoes) {
      const date = parseISO(g.data);
      const key = format(date, "yyyy-MM");
      if (!map[key]) {
        map[key] = { label: format(date, "MMMM 'de' yyyy", { locale: ptBR }), items: [] };
      }
      map[key].items.push(g);
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, { label, items }]) => [label, items] as [string, any[]]);
  }, [gravacoes, sortMode]);

  // Separa series
  const serieGroups = useMemo(() => {
    const map: Record<string, { nome: string; items: any[] }> = {};
    for (const g of gravacoes) {
      if (g.serieInfo) {
        const key = g.serieId;
        if (!map[key]) map[key] = { nome: g.serieInfo.nome, items: [] };
        map[key].items.push(g);
      }
    }
    return Object.entries(map);
  }, [gravacoes]);

  const semSerie = useMemo(() => gravacoes.filter((g) => !g.serieInfo), [gravacoes]);

  if (gravacoes.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhuma gravacao encontrada</p>;
  }

  // Se tem series, mostra agrupado por serie primeiro
  if (serieGroups.length > 0) {
    return (
      <div className="space-y-6">
        {serieGroups.map(([serieId, serie]) => (
          <div key={serieId} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {serie.nome}
            </h2>
            <div className="space-y-2">
              {serie.items.map((g: any) => (
                <GravacaoCard key={g._id} g={g} showStatus={showStatus} />
              ))}
            </div>
          </div>
        ))}

        {semSerie.length > 0 && (
          <div className="space-y-2">
            {semSerie.map((g: any) => (
              <GravacaoCard key={g._id} g={g} showStatus={showStatus} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sem series — mostra agrupado por data ou pregador
  return (
    <div className="space-y-6">
      {grouped.map(([label, items]) => (
        <div key={label} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </h2>
          <div className="space-y-2">
            {(items as any[]).map((g: any) => (
              <GravacaoCard key={g._id} g={g} showStatus={showStatus} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GravacoesPage() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("data");
  const { can } = useAuth();
  const isManager = can("gravacoes:update") || can("gravacoes:process_ai");

  const debouncedSearch = useDebounce(search, 300);

  // @ts-ignore Convex TS2589
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    search: debouncedSearch || undefined,
    tipo: tipoFilter === "ALL" ? undefined : tipoFilter,
  });

  const visibleGravacoes = gravacoes
    ? isManager
      ? gravacoes
      : gravacoes.filter((g: any) => g.status === "PUBLICADO")
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gravacoes</h1>
          {isManager && visibleGravacoes && (
            <p className="text-sm text-muted-foreground">{visibleGravacoes.length} gravacao(oes)</p>
          )}
        </div>
        <PermissionGate permission="gravacoes:create">
          <Button asChild>
            <Link href="/gravacoes/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova Gravacao
            </Link>
          </Button>
        </PermissionGate>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por titulo, pregador, texto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={sortMode === "data" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("data")}
          >
            Por data
          </Button>
          <Button
            variant={sortMode === "pregador" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("pregador")}
          >
            Por pregador
          </Button>
        </div>
        {isManager && (
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {TIPO_GRAVACAO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {visibleGravacoes === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <GravacoesList gravacoes={visibleGravacoes} showStatus={isManager} sortMode={sortMode} />
      )}
    </div>
  );
}
