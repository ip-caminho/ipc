"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, MessageCircle } from "lucide-react";
import Link from "next/link";
import { BibleBookFilter } from "@features/gravacoes/components/BibleBookFilter";
import { extractBookName } from "@features/gravacoes/lib/bible";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { cn } from "@shared/lib/utils/cn";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortMode = "data" | "pregador";

// --- Tag pills ---

function TagPill({
  tag,
  count,
  active,
  onClick,
}: {
  tag: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-2.5 py-1 rounded-full font-medium transition-colors duration-150 cursor-pointer select-none",
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        active && "border border-blue-400 ring-1 ring-emerald-400/30",
        !active && "border border-transparent",
      )}
    >
      {tag} ({count})
    </button>
  );
}

function TagsBar({
  tags,
  activeTag,
  onSelect,
}: {
  tags: { tag: string; count: number }[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!tags || tags.length === 0) return null;

  const TOP_N = 5;
  const visible = expanded ? tags : tags.slice(0, TOP_N);
  const hiddenCount = tags.length - TOP_N;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visible.map(({ tag, count }) => (
        <TagPill
          key={tag}
          tag={tag}
          count={count}
          active={activeTag === tag}
          onClick={() => onSelect(activeTag === tag ? null : tag)}
        />
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs px-2.5 py-1 rounded-full font-medium text-muted-foreground hover:text-foreground bg-muted transition-colors duration-150"
        >
          + {hiddenCount} topicos
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs px-2.5 py-1 rounded-full font-medium text-muted-foreground hover:text-foreground bg-muted transition-colors duration-150"
        >
          Ver menos
        </button>
      )}
      {activeTag && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 ml-1"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

// --- Section header ---

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {count} gravac{count !== 1 ? "oes" : "ao"}
      </span>
    </div>
  );
}

// --- Gravacao card ---

function GravacaoCard({ g }: { g: any }) {
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;
  const date = parseISO(g.data);
  const dia = format(date, "dd");
  const mes = format(date, "MMM", { locale: ptBR }).replace(".", "");
  const tags = (g.tags || []).slice(0, 2);

  return (
    <Link
      href={`/gravacoes/${g._id}`}
      className="flex items-start gap-0 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors duration-150 cursor-pointer"
    >
      {/* Date anchor */}
      <div className="flex flex-col items-center justify-start pt-0.5 min-w-[36px]">
        <span className="text-xl font-medium leading-none text-foreground">{dia}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{mes}</span>
      </div>

      {/* Separator */}
      <div className="w-px bg-border self-stretch mx-3" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + passage badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-medium leading-snug">{g.titulo}</h3>
          {g.textoBase && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground dark:bg-muted dark:text-foreground font-medium whitespace-nowrap flex-shrink-0">
              {g.textoBase}
            </span>
          )}
        </div>

        {/* Pregador */}
        {pregador && (
          <p className="text-sm text-muted-foreground mt-0.5">{pregador}</p>
        )}

        {/* Resumo */}
        {g.descricao && (
          <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mt-1">{g.descricao}</p>
        )}

        {/* Tags + reactions */}
        {(tags.length > 0 || (g.reacoesSummary && g.reacoesSummary.length > 0) || g.comentarioCount > 0) && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {tag}
                </span>
              ))}
              {g.serieInfo && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                  {g.serieInfo.nome}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          </div>
        )}
      </div>
    </Link>
  );
}

// --- Grouped list ---

function GravacoesList({
  gravacoes,
  sortMode,
  onClearFilters,
}: {
  gravacoes: any[];
  sortMode: SortMode;
  onClearFilters: () => void;
}) {
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
      .map(([, { label, items }]) => [label, items] as [string, any[]]);
  }, [gravacoes, sortMode]);

  if (gravacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma gravacao encontrada.</p>
        <button
          onClick={onClearFilters}
          className="mt-3 text-sm text-primary underline-offset-2 hover:underline"
        >
          Limpar filtros
        </button>
      </div>
    );
  }

  return (
    <div>
      {grouped.map(([label, items]) => (
        <div key={label}>
          <SectionHeader label={label} count={(items as any[]).length} />
          <div className="space-y-3">
            {(items as any[]).map((g: any) => (
              <GravacaoCard key={g._id} g={g} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Page ---

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

  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setLivroFilter(null);
  };

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: "data", label: "Por data" },
    { key: "pregador", label: "Pregador" },
  ];

  return (
    <ModuloGuard modulo="gravacoes">
      <div className="space-y-4">
        <h1 className="text-2xl font-medium">Gravacoes</h1>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Segmented control */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
            {sortOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortMode(key)}
                className={cn(
                  "px-4 py-1.5 text-sm rounded-lg transition-colors duration-150",
                  sortMode === key
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Bible book filter */}
          {gravacoes && (
            <BibleBookFilter
              gravacoes={gravacoes.filter((g: any) => g.status === "PUBLICADO")}
              selected={livroFilter}
              onSelect={setLivroFilter}
            />
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-sm min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por titulo, pregador, texto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 pl-9 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Tags */}
        {allTags && allTags.length > 0 && (
          <TagsBar tags={allTags} activeTag={tagFilter} onSelect={setTagFilter} />
        )}

        {/* List */}
        {visibleGravacoes === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <GravacoesList
            gravacoes={visibleGravacoes}
            sortMode={sortMode}
            onClearFilters={clearFilters}
          />
        )}
      </div>
    </ModuloGuard>
  );
}
