"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, MessageCircle, Tag, X } from "lucide-react";
import Link from "next/link";
import { BibleBookFilter } from "@features/gravacoes/components/BibleBookFilter";
import { extractBookName } from "@features/gravacoes/lib/bible";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortMode = "data" | "pregador";

function GravacaoCard({ g }: { g: any }) {
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;

  return (
    <Link href={`/gravacoes/${g._id}`} className="block py-4 hover:bg-accent/30 -mx-3 px-3 rounded-md transition-colors">
      <h3 className="font-medium leading-tight">{g.titulo}</h3>
      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
        <span>{format(parseISO(g.data), "dd 'de' MMMM", { locale: ptBR })}</span>
        {pregador && <><span className="text-muted-foreground/40">·</span><span>{pregador}</span></>}
        {g.textoBase && <><span className="text-muted-foreground/40">·</span><span>{g.textoBase}</span></>}
      </div>
      {g.descricao && (
        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{g.descricao}</p>
      )}
      {((g.serieInfo) || (g.reacoesSummary && g.reacoesSummary.length > 0) || g.comentarioCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          {g.serieInfo && (
            <Badge variant="outline" className="text-xs">{g.serieInfo.nome}</Badge>
          )}
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
    </Link>
  );
}

function GravacoesList({ gravacoes, sortMode }: { gravacoes: any[]; sortMode: SortMode }) {
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
      <div className="space-y-8">
        {serieGroups.map(([serieId, serie]) => (
          <div key={serieId} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {serie.nome}
            </h2>
            <div className="divide-y">
              {serie.items.map((g: any) => (
                <GravacaoCard key={g._id} g={g} />
              ))}
            </div>
          </div>
        ))}

        {semSerie.length > 0 && (
          <div className="divide-y">
            {semSerie.map((g: any) => (
              <GravacaoCard key={g._id} g={g} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sem series — mostra agrupado por data ou pregador
  return (
    <div className="space-y-8">
      {grouped.map(([label, items]) => (
        <div key={label} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </h2>
          <div className="divide-y">
            {(items as any[]).map((g: any) => (
              <GravacaoCard key={g._id} g={g} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GravacoesPage() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [livroFilter, setLivroFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("data");

  const debouncedSearch = useDebounce(search, 300);

  // @ts-ignore Convex TS2589
  const allTags = useQuery(api.gravacoes.queries.listTags);

  // @ts-ignore Convex TS2589
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    search: debouncedSearch || undefined,
    tag: tagFilter || undefined,
  });

  const visibleGravacoes = useMemo(() => {
    if (!gravacoes) return undefined;
    let result = gravacoes.filter((g: any) => g.status === "PUBLICADO");
    if (livroFilter) {
      result = result.filter((g: any) => extractBookName(g.textoBase) === livroFilter);
    }
    return result;
  }, [gravacoes, livroFilter]);

  return (
    <ModuloGuard modulo="gravacoes">
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gravacoes</h1>

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
        {gravacoes && (
          <BibleBookFilter
            gravacoes={gravacoes.filter((g: any) => g.status === "PUBLICADO")}
            selected={livroFilter}
            onSelect={setLivroFilter}
          />
        )}
      </div>

      {allTags && allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {allTags.map(({ tag, count }) => (
            <Badge
              key={tag}
              variant={tagFilter === tag ? "default" : "outline"}
              className="text-xs cursor-pointer select-none"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            >
              {tag} ({count})
            </Badge>
          ))}
          {tagFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setTagFilter(null)}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      )}

      {visibleGravacoes === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <GravacoesList gravacoes={visibleGravacoes} sortMode={sortMode} />
      )}
    </div>
    </ModuloGuard>
  );
}
