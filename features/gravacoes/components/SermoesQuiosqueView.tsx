"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ChevronLeft, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { AudioListItem, type AudioListItemData } from "@features/gravacoes/components/AudioListItem";
import { SecureAudioPlayer } from "@shared/files/components/SecureAudioPlayer";

type SermaoLista = AudioListItemData & { textoBase?: string | null };

function SermaoListaTela({
  onSelect,
  search,
  setSearch,
}: {
  onSelect: (id: Id<"gravacoes">) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const debounced = useDebounce(search, 300);
  // @ts-ignore Convex TS2589
  const sermoes = useQuery(api.gravacoes.queries.listSermoesQuiosque, {
    search: debounced || undefined,
  });

  const ordenados = useMemo<SermaoLista[] | undefined>(() => {
    if (!sermoes) return undefined;
    return [...(sermoes as SermaoLista[])].sort((a, b) => b.data.localeCompare(a.data));
  }, [sermoes]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:max-w-2xl md:mx-auto">
      <h1 className="text-2xl font-bold">Sermões</h1>

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
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-base md:text-sm rounded-md bg-secondary px-3 h-11 pl-9 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Buscar sermões"
        />
      </div>

      {ordenados === undefined ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : ordenados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          Nenhum sermão disponível.
        </p>
      ) : (
        <ul className="flex flex-col">
          {ordenados.map((s) => (
            <li key={s._id}>
              <button
                type="button"
                onClick={() => onSelect(s._id as Id<"gravacoes">)}
                className="w-full text-left"
              >
                <AudioListItem audio={s} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SermaoDetalhe({
  id,
  onBack,
}: {
  id: Id<"gravacoes">;
  onBack: () => void;
}) {
  // @ts-ignore Convex TS2589
  const sermao = useQuery(api.gravacoes.queries.getSermaoQuiosque, { id });

  if (sermao === undefined) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:max-w-2xl md:mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!sermao) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:max-w-2xl md:mx-auto">
        <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <p className="text-sm text-muted-foreground">Sermão não encontrado.</p>
      </div>
    );
  }

  const dataLabel = (() => {
    try {
      return format(parseISO(sermao.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return sermao.data;
    }
  })();

  const inicio = sermao.inicioConteudo ?? sermao.inicioSermao ?? null;
  const fim = sermao.fimConteudo ?? sermao.fimSermao ?? null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:max-w-2xl md:mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Sermões
      </Button>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold leading-tight">{sermao.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {[sermao.pregadorNome, dataLabel].filter(Boolean).join(" · ")}
        </p>
        {sermao.textoBase && (
          <p className="text-sm text-muted-foreground italic">{sermao.textoBase}</p>
        )}
      </div>

      {sermao.audioUrl ? (
        <SecureAudioPlayer
          url={sermao.audioUrl}
          inicioSermao={inicio}
          fimSermao={fim}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Áudio indisponível.</p>
      )}
    </div>
  );
}

export function SermoesQuiosqueView() {
  const [selectedId, setSelectedId] = useState<Id<"gravacoes"> | null>(null);
  const [search, setSearch] = useState("");

  if (selectedId) {
    return (
      <SermaoDetalhe
        id={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <SermaoListaTela
      onSelect={setSelectedId}
      search={search}
      setSearch={setSearch}
    />
  );
}
