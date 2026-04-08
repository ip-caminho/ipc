"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, MessageCircle, SlidersHorizontal, X, Mic, BookOpen as BookOpenIcon, Presentation, Users2, ArrowLeft } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import Link from "next/link";
import { BibleBookFilter } from "@features/gravacoes/components/BibleBookFilter";
import { FrasesCarrossel } from "@features/gravacoes/components/FrasesCarrossel";
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
        "text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors duration-150 cursor-pointer select-none whitespace-nowrap min-h-[32px] shrink-0",
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
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible scrollbar-none">
      {tags.map(({ tag, count }) => (
        <TagPill
          key={tag}
          tag={tag}
          count={count}
          active={activeTag === tag}
          onClick={() => onSelect(activeTag === tag ? null : tag)}
        />
      ))}
      {activeTag && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 ml-1 whitespace-nowrap shrink-0 min-h-[32px]"
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

// Mobile: lista compacta sem tags/descrição
function GravacaoCardMobile({ g, index }: { g: any; index: number }) {
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;
  const date = parseISO(g.data);
  const dia = format(date, "dd");
  const mes = format(date, "MMM", { locale: ptBR }).replace(".", "");

  return (
    <Link
      href={`/gravacoes/${g._id}`}
      className={cn(
        "flex items-center gap-3 py-3 px-3 border-b border-border last:border-0 transition-colors min-h-[56px] rounded-lg",
        index % 2 === 0 ? "bg-muted/30" : "bg-transparent",
      )}
    >
      <div className="flex flex-col items-center min-w-[32px]">
        <span className="text-lg font-medium leading-none">{dia}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{mes}</span>
      </div>
      <div className="flex-1 min-w-0">
        {g.tipo === "SERMAO" ? (
          <>
            {g.textoBase && <p className="text-sm font-medium leading-snug">{g.textoBase}</p>}
            {pregador && <p className="text-sm text-muted-foreground mt-0.5">{pregador}</p>}
          </>
        ) : (
          <>
            <p className="text-sm font-medium leading-snug">{g.titulo}</p>
            {pregador && <p className="text-sm text-muted-foreground mt-0.5">{pregador}</p>}
          </>
        )}
      </div>
      {g.comentarioCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <MessageCircle className="h-3 w-3" />
          {g.comentarioCount}
        </div>
      )}
    </Link>
  );
}

// Desktop: card completo com tags e descrição
function GravacaoCardDesktop({ g }: { g: any }) {
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
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-medium leading-snug">{g.titulo}</h3>
          {g.textoBase && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground font-medium whitespace-nowrap flex-shrink-0">
              {g.textoBase}
            </span>
          )}
        </div>

        {pregador && (
          <p className="text-sm text-muted-foreground mt-0.5">{pregador}</p>
        )}

        {g.descricao && (
          <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mt-1">{g.descricao}</p>
        )}

        {(tags.length > 0 || g.serieInfo || (g.reacoesSummary && g.reacoesSummary.length > 0) || g.comentarioCount > 0) && (
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

function GravacaoCard({ g, index = 0 }: { g: any; index?: number }) {
  return (
    <>
      <div className="md:hidden">
        <GravacaoCardMobile g={g} index={index} />
      </div>
      <div className="hidden md:block">
        <GravacaoCardDesktop g={g} />
      </div>
    </>
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
        <p className="text-base text-muted-foreground">Nenhuma gravação encontrada.</p>
        <button
          onClick={onClearFilters}
          className="mt-3 text-base text-primary underline-offset-2 hover:underline min-h-[44px]"
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
          <div className="space-y-3 md:space-y-3">
            {(items as any[]).map((g: any, i: number) => (
              <GravacaoCard key={g._id} g={g} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Page ---

const TIPO_OPTIONS = [
  { value: "SERMAO", label: "Pregações", icon: Mic, color: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30", textColor: "text-blue-700 dark:text-blue-300", iconColor: "text-blue-600 dark:text-blue-400" },
  { value: "ESTUDO_BIBLICO", label: "Estudos", icon: BookOpenIcon, color: "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30", textColor: "text-violet-700 dark:text-violet-300", iconColor: "text-violet-600 dark:text-violet-400" },
  { value: "PALESTRA", label: "Palestras", icon: Presentation, color: "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30", textColor: "text-teal-700 dark:text-teal-300", iconColor: "text-teal-600 dark:text-teal-400" },
  { value: "OUTRO", label: "Outros", icon: Users2, color: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30", textColor: "text-amber-700 dark:text-amber-300", iconColor: "text-amber-600 dark:text-amber-400" },
] as const;

export default function GravacoesPage() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [livroFilter, setLivroFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("data");
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);

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
    if (tipoFilter) {
      result = result.filter((g: any) => g.tipo === tipoFilter);
    }
    if (livroFilter) {
      result = result.filter((g: any) => extractBookName(g.textoBase) === livroFilter);
    }
    return result;
  }, [gravacoes, livroFilter, tipoFilter]);

  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setLivroFilter(null);
  };

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: "data", label: "Por data" },
    { key: "pregador", label: "Pregador" },
  ];

  const activeFilterCount = (tagFilter ? 1 : 0) + (livroFilter ? 1 : 0);
  const [tagsDrawerOpen, setTagsDrawerOpen] = useState(false);
  const [desktopTagsOpen, setDesktopTagsOpen] = useState(false);
  const [mobileDrawerTipo, setMobileDrawerTipo] = useState<string | null>(null);

  const tipoLabel = TIPO_OPTIONS.find((t) => t.value === tipoFilter)?.label || "Gravações";

  // Tela de entrada — sem tipo selecionado
  if (!tipoFilter) {
    return (
      <ModuloGuard modulo="gravacoes">
        {/* Mobile: tela de entrada com drawer */}
        <div className="md:hidden flex flex-col justify-between" style={{ minHeight: "calc(100dvh - 10rem)" }}>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Ouvir</h1>
            <FrasesCarrossel />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            {TIPO_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setMobileDrawerTipo(t.value)}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 ${t.color} p-5 hover:opacity-80 active:opacity-70 transition-opacity min-h-[100px]`}
              >
                <t.icon className={`h-8 w-8 ${t.iconColor}`} />
                <span className={`text-base font-medium ${t.textColor}`}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Drawer para lista filtrada */}
          <Drawer open={!!mobileDrawerTipo} onOpenChange={(open) => { if (!open) { setMobileDrawerTipo(null); setSearch(""); } }}>
            <DrawerContent className="max-h-[85vh]">
              <div className="px-4 pb-6 pt-2 overflow-y-auto">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-base rounded-xl border border-border bg-background px-3 py-2.5 pl-10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                {(() => {
                  if (!gravacoes) return <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>;
                  const filtered = gravacoes
                    .filter((g: any) => g.status === "PUBLICADO" && g.tipo === mobileDrawerTipo)
                    .filter((g: any) => !debouncedSearch || g.titulo.toLowerCase().includes(debouncedSearch.toLowerCase()) || (g.pregadorNome || "").toLowerCase().includes(debouncedSearch.toLowerCase()))
                    .sort((a: any, b: any) => b.data.localeCompare(a.data));
                  if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma gravação encontrada</p>;
                  return (
                    <div className="space-y-1">
                      {filtered.map((g: any, i: number) => (
                        <GravacaoCardMobile key={g._id} g={g} index={i} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Desktop: set filter directly */}
        <div className="hidden md:block space-y-4">
          <h1 className="text-2xl font-bold">Ouvir</h1>
          <FrasesCarrossel />
          <div className="grid grid-cols-4 gap-3">
            {TIPO_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTipoFilter(t.value)}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 ${t.color} p-5 hover:opacity-80 active:opacity-70 transition-opacity min-h-[100px]`}
              >
                <t.icon className={`h-8 w-8 ${t.iconColor}`} />
                <span className={`text-base font-medium ${t.textColor}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="gravacoes">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { setTipoFilter(null); clearFilters(); }} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-medium">{tipoLabel}</h1>
        </div>

        {/* === MOBILE === */}
        <div className="md:hidden space-y-3">
          {/* Search — sticky */}
          <div className="sticky top-0 z-10 bg-background pt-1 pb-2 -mx-4 px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-base rounded-xl border border-border bg-background px-3 py-2.5 pl-10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <div className="flex gap-1 bg-muted rounded-xl p-1 shrink-0">
              {sortOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortMode(key)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap min-h-[36px]",
                    sortMode === key
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bible book */}
            {gravacoes && (
              <BibleBookFilter
                gravacoes={gravacoes.filter((g: any) => g.status === "PUBLICADO")}
                selected={livroFilter}
                onSelect={setLivroFilter}
              />
            )}

            {/* Topics drawer trigger */}
            <Drawer open={tagsDrawerOpen} onOpenChange={setTagsDrawerOpen}>
              <DrawerTrigger
                onClick={() => setTagsDrawerOpen(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border min-h-[36px] transition-colors shrink-0",
                  tagFilter
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    : "border-border text-muted-foreground",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Tópicos
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="text-base">Filtrar por tópico</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
                  {tagFilter && (
                    <button
                      onClick={() => { setTagFilter(null); setTagsDrawerOpen(false); }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 min-h-[44px]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar filtro
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {allTags?.map(({ tag, count }: { tag: string; count: number }) => (
                      <button
                        key={tag}
                        onClick={() => { setTagFilter(tagFilter === tag ? null : tag); setTagsDrawerOpen(false); }}
                        className={cn(
                          "text-left px-3 py-2.5 rounded-xl border text-sm transition-colors min-h-[44px]",
                          tagFilter === tag
                            ? "border-blue-400 bg-blue-50 text-blue-700 font-medium dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-border text-foreground hover:bg-muted",
                        )}
                      >
                        {tag}
                        <span className="text-xs text-muted-foreground ml-1">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0 min-h-[36px]"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* === DESKTOP === */}
        <div className="hidden md:block space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
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

            {gravacoes && (
              <BibleBookFilter
                gravacoes={gravacoes.filter((g: any) => g.status === "PUBLICADO")}
                selected={livroFilter}
                onSelect={setLivroFilter}
              />
            )}

            {/* Tópicos toggle */}
            {allTags && allTags.length > 0 && (
              <button
                type="button"
                onClick={() => setDesktopTagsOpen(!desktopTagsOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border transition-colors",
                  tagFilter
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Tópicos
                {tagFilter && (
                  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">1</span>
                )}
              </button>
            )}

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

          {/* Tags expandíveis */}
          {desktopTagsOpen && allTags && allTags.length > 0 && (
            <TagsBar tags={allTags} activeTag={tagFilter} onSelect={setTagFilter} />
          )}
        </div>

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
