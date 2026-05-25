"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { parseAsString, useQueryState } from "nuqs";
import { Search, ChevronLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@shared/components/auth/SemPermissaoFallback";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useDebounce } from "@shared/hooks/useDebounce";
import { AudioFilterChips } from "@features/gravacoes/components/AudioFilterChips";
import { AudioList } from "@features/gravacoes/components/AudioList";
import type { AudioListItemData } from "@features/gravacoes/components/AudioListItem";
import type { AudioTipo } from "@features/gravacoes/lib/categoryGradient";
import { BibleBookFilter } from "@features/gravacoes/components/BibleBookFilter";
import { extractBookName } from "@features/gravacoes/lib/bible";

const VALID_TIPOS = new Set(["SERMAO", "ESTUDO_BIBLICO", "PALESTRA", "OUTRO"]);

function GravacoesContent() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [tipoParam, setTipoParam] = useQueryState("tipo", parseAsString.withDefault(""));
  const [livro, setLivro] = useQueryState("livro", parseAsString.withDefault(""));
  const debouncedSearch = useDebounce(search, 300);

  const tipo = (VALID_TIPOS.has(tipoParam) ? tipoParam : null) as AudioTipo | null;

  // @ts-expect-error Convex TS2589
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    status: "PUBLICADO",
    tipo: tipo ?? undefined,
    search: debouncedSearch || undefined,
  });

  const audios = useMemo<AudioListItemData[] | undefined>(() => {
    if (!gravacoes) return undefined;
    let result = (gravacoes as (AudioListItemData & { textoBase?: string })[]).slice();
    if (livro) {
      result = result.filter((g) => extractBookName(g.textoBase) === livro);
    }
    return result.sort((a, b) => b.data.localeCompare(a.data));
  }, [gravacoes, livro]);

  return (
    <ModuloGuard modulo="gravacoes">
      <HeaderLayout>
        <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
          <div className="flex flex-col gap-4 py-4 md:py-6">
            <div className="px-4 flex flex-col gap-1">
              <Link
                href="/comunidade"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground w-fit min-h-11 active:opacity-70"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Gravações
              </Link>
              <PageHeader title="Todos" />
            </div>

          <div className="px-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                inputMode="search"
                placeholder="Buscar por título ou pregador"
                value={search}
                onChange={(e) => setSearch(e.target.value || null)}
                className="w-full text-base md:text-sm rounded-md bg-secondary px-3 h-11 pl-9 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Buscar áudios"
              />
            </div>
          </div>

          <div className="px-4">
            <AudioFilterChips selected={tipo} onSelect={(v) => setTipoParam(v || null)} />
          </div>

          {gravacoes && gravacoes.length > 0 && (
            <div className="px-4">
              <BibleBookFilter
                gravacoes={gravacoes}
                selected={livro || null}
                onSelect={(v) => setLivro(v || null)}
              />
            </div>
          )}

          <div className="px-4">
            <AudioList audios={audios} />
          </div>
          </div>
        </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}

export default function GravacoesPage() {
  return (
    <PermissionGate permission="gravacoes:read" fallback={<SemPermissaoFallback />}>
      <GravacoesContent />
    </PermissionGate>
  );
}
