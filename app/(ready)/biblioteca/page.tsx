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
import { Plus, Search, AlertCircle, BookMarked } from "lucide-react";
import { LivroCard } from "@features/biblioteca/components/LivroCard";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { SemPermissaoFallback } from "@/shared/components/auth/SemPermissaoFallback";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { parseAsString, useQueryState } from "nuqs";
import Link from "next/link";
import { useDebounce } from "@shared/hooks/useDebounce";

const LIVROS_POR_PAGINA = 24;

function BibliotecaContent() {
  const { can } = useAuth();
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
  const podeEmprestar = can("biblioteca:emprestar");
  const atrasados = useQuery(api.biblioteca.queries.contarAtrasados, podeEmprestar ? {} : "skip");
  const meusEmprestimos = useQuery(api.biblioteca.queries.meusEmprestimos);

  return (
    <ModuloGuard modulo="biblioteca">
      <HeaderLayout>
      <div className="container max-w-4xl py-6 space-y-4">
        <PageHeader title="Biblioteca" />
        <div className="flex items-center justify-end flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {meusEmprestimos && meusEmprestimos.length > 0 && (
              <Link href="/biblioteca/meus-emprestimos">
                <Button variant="outline" size="sm">
                  <BookMarked className="h-4 w-4 mr-1" />
                  Meus empréstimos ({meusEmprestimos.length})
                </Button>
              </Link>
            )}
            {podeEmprestar && !!atrasados && (
              <Link href="/biblioteca/atrasados">
                <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:text-red-700">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {atrasados} atrasado{atrasados !== 1 ? "s" : ""}
                </Button>
              </Link>
            )}
            <PermissionGate permission="biblioteca:create">
              <Link href="/biblioteca/lote">
                <Button variant="outline" size="sm">
                  Lote
                </Button>
              </Link>
              <Link href="/biblioteca/novo">
                <Button size="sm">
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
              placeholder="Buscar por titulo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoria || "__all__"} onValueChange={(v) => setCategoria(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[180px]">
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
          <div className="grid gap-3 sm:grid-cols-2">
            {livros.map((l) => (
              <LivroCard key={l._id} livro={l} />
            ))}
          </div>
        )}

        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(LIVROS_POR_PAGINA)}
            >
              {status === "LoadingMore" ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}

export default function BibliotecaPage() {
  return (
    <PermissionGate permission="biblioteca:read" fallback={<SemPermissaoFallback />}>
      <BibliotecaContent />
    </PermissionGate>
  );
}
