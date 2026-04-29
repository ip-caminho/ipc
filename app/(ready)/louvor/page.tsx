"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@shared/components/auth/SemPermissaoFallback";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useDebounce } from "@shared/hooks/useDebounce";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LouvorCard } from "@features/louvor/components/LouvorCard";
import { LouvorForm } from "@features/louvor/components/LouvorForm";
import { LouvorDetalhe } from "@features/louvor/components/LouvorDetalhe";
import type { LouvorFormValues } from "@features/louvor/lib/validations";
import { cn } from "@shared/lib/utils/cn";

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
        "text-xs px-2.5 py-1 rounded-full font-medium transition-colors duration-150 cursor-pointer select-none min-h-[32px]",
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        active && "border border-blue-400 ring-1 ring-emerald-400/30",
        !active && "border border-transparent",
      )}
    >
      {tag} ({count})
    </button>
  );
}

function LouvorContent() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tomFilter, setTomFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"louvores"> | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const createLouvor = useMutation(api.louvor.mutations.create);

  // @ts-ignore Convex TS2589
  const louvores = useQuery(api.louvor.queries.list, {
    search: debouncedSearch || undefined,
    tag: tagFilter || undefined,
    tom: tomFilter || undefined,
    status: "ATIVO",
  });

  // @ts-ignore Convex TS2589
  const allTags = useQuery(api.louvor.queries.listTags);

  const tomsDisponiveis = useMemo(() => {
    if (!louvores) return [];
    const toms = new Set<string>();
    for (const l of louvores) {
      if (l.tom) toms.add(l.tom);
    }
    return Array.from(toms).sort();
  }, [louvores]);

  const handleCreate = async (data: LouvorFormValues) => {
    try {
      await createLouvor({
        titulo: data.titulo,
        artista: data.artista || undefined,
        tom: data.tom || undefined,
        tomHomem: data.tomHomem || undefined,
        tomMulher: data.tomMulher || undefined,
        bpm: data.bpm && data.bpm !== "" ? Number(data.bpm) : undefined,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        conteudo: data.conteudo || undefined,
        youtubeUrl: data.youtubeUrl || undefined,
        spotifyUrl: data.spotifyUrl || undefined,
        observacoes: data.observacoes || undefined,
        estrutura: data.estrutura || undefined,
      });
      toast.success("Música criada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar musica");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setTomFilter(null);
  };

  const handleSelect = (id: Id<"louvores">) => {
    if (isMobile) {
      router.push(`/louvor/${id}`);
    } else {
      setSelectedId(id);
    }
  };

  return (
    <ModuloGuard modulo="louvor">
      <HeaderLayout>
      <div className="flex gap-6 md:h-[calc(100vh-6rem)]">
        {/* Coluna esquerda: lista */}
        <div className={cn(
          "flex flex-col gap-4 overflow-y-auto shrink-0 w-full",
          selectedId && !isMobile && "w-80",
          selectedId && !isMobile && "!w-80",
          !selectedId && "md:flex-1",
        )}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <PageHeader title="Louvor" />
            <PermissionGate permission="louvor:create">
              <Button size="sm" onClick={() => setCreateOpen(true)} className="min-h-[44px] md:min-h-0">
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </PermissionGate>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-base md:text-sm rounded-xl border border-border bg-background px-3 py-2.5 md:py-2 pl-10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Filters */}
          {(!selectedId || isMobile) && (
            <>
              {tomsDisponiveis.length > 0 && (
                <div className="flex gap-1 bg-muted rounded-xl p-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTomFilter(null)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg transition-colors min-h-[32px]",
                      !tomFilter
                        ? "bg-background text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Todos
                  </button>
                  {tomsDisponiveis.slice(0, 8).map((tom) => (
                    <button
                      key={tom}
                      type="button"
                      onClick={() => setTomFilter(tomFilter === tom ? null : tom)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-lg transition-colors min-h-[32px]",
                        tomFilter === tom
                          ? "bg-background text-foreground font-medium shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tom}
                    </button>
                  ))}
                </div>
              )}

              {allTags && allTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {allTags.slice(0, 10).map(({ tag, count }) => (
                    <TagPill
                      key={tag}
                      tag={tag}
                      count={count}
                      active={tagFilter === tag}
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    />
                  ))}
                  {tagFilter && (
                    <button
                      type="button"
                      onClick={() => setTagFilter(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 min-h-[32px]"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* List */}
          {louvores === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : louvores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base text-muted-foreground">Nenhuma musica encontrada.</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-base text-primary underline-offset-2 hover:underline min-h-[44px]"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className={cn(
              "space-y-2",
              !selectedId && "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 space-y-0",
            )}>
              {louvores.map((l: any) => (
                <LouvorCard
                  key={l._id}
                  louvor={l}
                  onClick={() => handleSelect(l._id)}
                  active={selectedId === l._id}
                  compact={!!selectedId && !isMobile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coluna direita: detalhe (desktop only) */}
        {selectedId && !isMobile && (
          <div className="flex-1 overflow-y-auto border-l pl-6">
            <LouvorDetalhe
              key={selectedId}
              louvorId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      {/* Create dialog */}
      <LouvorForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      </HeaderLayout>
    </ModuloGuard>
  );
}

export default function LouvorPage() {
  return (
    <PermissionGate permission="louvor:read" fallback={<SemPermissaoFallback />}>
      <LouvorContent />
    </PermissionGate>
  );
}
