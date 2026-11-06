"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Search, BookMarked } from "lucide-react";
import { LivroCard } from "@features/biblioteca/components/LivroCard";
import { Prancheta } from "@features/biblioteca/components/Prancheta";
import { pilula } from "@features/biblioteca/lib/estilos";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@/shared/components/auth/SemPermissaoFallback";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { parseAsString, useQueryState } from "nuqs";
import Link from "next/link";
import { useDebounce } from "@shared/hooks/useDebounce";

const LIVROS_POR_PAGINA = 24;

// Quem cuida da estante abre na prancheta; a lista de livros fica em ?ver=livros.
function BibliotecaContent() {
  const { can } = useAuth();
  const [ver] = useQueryState("ver", parseAsString);
  const podeEmprestar = can("biblioteca:emprestar");

  return (
    <ModuloGuard modulo="biblioteca">
      {podeEmprestar && ver !== "livros" ? (
        <Prancheta />
      ) : (
        <ListaDeLivros voltarParaPrancheta={podeEmprestar} />
      )}
    </ModuloGuard>
  );
}

function ListaDeLivros({ voltarParaPrancheta }: { voltarParaPrancheta: boolean }) {
  const [busca, setBusca] = useQueryState("q", parseAsString.withDefault(""));
  const [categoria, setCategoria] = useQueryState("cat", parseAsString.withDefault(""));
  const debouncedBusca = useDebounce(busca, 300);

  const { results: livros, status, loadMore } = usePaginatedQuery(
    api.biblioteca.queries.list,
    {
      busca: debouncedBusca || undefined,
      categoria: categoria || undefined,
    },
    { initialNumItems: LIVROS_POR_PAGINA }
  );
  const categorias = useQuery(api.biblioteca.queries.listCategorias);
  const meusEmprestimos = useQuery(api.biblioteca.queries.meusEmprestimos);

  return (
    <HeaderLayout>
      <div className="container max-w-4xl py-6 space-y-4">
        <PageHeader
          title={voltarParaPrancheta ? "Todos os livros" : "Biblioteca"}
          backHref={voltarParaPrancheta ? "/biblioteca" : undefined}
        />
        <div className="flex items-center justify-end flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {meusEmprestimos && meusEmprestimos.length > 0 && (
              <Link href="/biblioteca/meus-emprestimos">
                <Button variant="secondary" size="sm" className={`h-11 px-4 md:h-9 ${pilula}`}>
                  <BookMarked className="h-4 w-4 mr-1" />
                  Meus empréstimos ({meusEmprestimos.length})
                </Button>
              </Link>
            )}
            <PermissionGate permission="biblioteca:create">
              <Link href="/biblioteca/lote">
                <Button variant="secondary" size="sm" className={`h-11 px-4 md:h-9 ${pilula}`}>
                  Lote
                </Button>
              </Link>
              <Link href="/biblioteca/novo">
                <Button size="sm" className={`h-11 px-4 md:h-9 ${pilula}`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Livro
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar título"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-11 rounded-full pl-9 md:h-9"
            />
          </div>
          <Select value={categoria || "__all__"} onValueChange={(v) => setCategoria(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-11 w-[130px] rounded-full md:h-9 md:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {categorias?.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {status === "LoadingFirstPage" ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : livros.length === 0 && status === "Exhausted" ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum livro encontrado</p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {livros.map((l) => (
              <LivroCard key={l._id} livro={l} />
            ))}
          </div>
        )}

        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className={`h-11 w-full px-6 sm:w-auto ${pilula}`}
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(LIVROS_POR_PAGINA)}
            >
              {status === "LoadingMore" ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </div>
    </HeaderLayout>
  );
}

export default function BibliotecaPage() {
  return (
    <PermissionGate permission="biblioteca:read" fallback={<SemPermissaoFallback />}>
      <BibliotecaContent />
    </PermissionGate>
  );
}
