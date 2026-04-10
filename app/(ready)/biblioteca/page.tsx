"use client";

import { useQuery } from "convex/react";
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
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { parseAsString, useQueryState } from "nuqs";
import Link from "next/link";
import { useDebounce } from "@shared/hooks/useDebounce";

export default function BibliotecaPage() {
  const { can } = useAuth();
  const [busca, setBusca] = useQueryState("q", parseAsString.withDefault(""));
  const [categoria, setCategoria] = useQueryState("cat", parseAsString.withDefault(""));
  const debouncedBusca = useDebounce(busca, 300);

  const livros = useQuery(api.biblioteca.queries.list, {
    busca: debouncedBusca || undefined,
    categoria: categoria || undefined,
  });
  const categorias = useQuery(api.biblioteca.queries.listCategorias);
  const atrasados = useQuery(api.biblioteca.queries.listAtrasados);
  const meusEmprestimos = useQuery(api.biblioteca.queries.meusEmprestimos);

  return (
    <ModuloGuard modulo="biblioteca">
      <div className="container max-w-4xl py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Biblioteca</h1>
          <div className="flex items-center gap-2">
            {meusEmprestimos && meusEmprestimos.length > 0 && (
              <Link href="/biblioteca/meus-emprestimos">
                <Button variant="outline" size="sm">
                  <BookMarked className="h-4 w-4 mr-1" />
                  Meus empréstimos ({meusEmprestimos.length})
                </Button>
              </Link>
            )}
            {can("biblioteca:emprestar") && atrasados && atrasados.length > 0 && (
              <Link href="/biblioteca/atrasados">
                <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:text-red-700">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {atrasados.length} atrasado{atrasados.length !== 1 ? "s" : ""}
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

        {!livros ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : livros.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum livro encontrado</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {livros.map((l: any) => (
              <LivroCard key={l._id} livro={l} />
            ))}
          </div>
        )}
      </div>
    </ModuloGuard>
  );
}
