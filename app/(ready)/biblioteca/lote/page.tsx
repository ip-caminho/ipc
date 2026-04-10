"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowLeft, Plus, X, Search, Loader2 } from "lucide-react";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import type { BookData } from "@features/biblioteca/components/BookSearch";

interface LivroLote extends BookData {
  tempId: string;
  condicao: "NOVO" | "BOM" | "REGULAR" | "RUIM";
  status: "encontrado" | "nao-encontrado";
}

async function buscarPorIsbn(isbn: string): Promise<BookData | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}&maxResults=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    const v = item.volumeInfo;
    const isbnFound = v.industryIdentifiers?.find(
      (id: any) => id.type === "ISBN_13" || id.type === "ISBN_10"
    )?.identifier;
    return {
      titulo: v.title || "",
      autores: v.authors || [],
      editora: v.publisher,
      isbn: isbnFound || cleanIsbn,
      ano: v.publishedDate ? parseInt(v.publishedDate.split("-")[0]) : undefined,
      descricao: v.description,
      paginas: v.pageCount,
      capaUrl: v.imageLinks?.thumbnail?.replace("http://", "https://"),
    };
  } catch {
    return null;
  }
}

export default function LotePage() {
  const router = useRouter();
  const createBatch = useMutation(api.biblioteca.mutations.createBatch);
  const [doadorNome, setDoadorNome] = useState("");
  const [isbnInput, setIsbnInput] = useState("");
  const [livros, setLivros] = useState<LivroLote[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleAdicionar() {
    const isbn = isbnInput.trim();
    if (!isbn) return;
    setBuscando(true);
    const data = await buscarPorIsbn(isbn);
    if (data) {
      setLivros((prev) => [...prev, {
        ...data,
        tempId: crypto.randomUUID(),
        condicao: "BOM",
        status: "encontrado",
      }]);
      setIsbnInput("");
    } else {
      setLivros((prev) => [...prev, {
        tempId: crypto.randomUUID(),
        titulo: "",
        autores: [],
        isbn,
        condicao: "BOM",
        status: "nao-encontrado",
      }]);
      setIsbnInput("");
    }
    setBuscando(false);
  }

  function removerLivro(tempId: string) {
    setLivros((prev) => prev.filter((l) => l.tempId !== tempId));
  }

  function atualizarLivro(tempId: string, updates: Partial<LivroLote>) {
    setLivros((prev) => prev.map((l) => l.tempId === tempId ? { ...l, ...updates } : l));
  }

  async function handleSalvar() {
    const validos = livros.filter((l) => l.titulo && l.autores.length > 0);
    if (validos.length === 0) {
      toast.error("Adicione ao menos um livro valido");
      return;
    }
    setSalvando(true);
    try {
      const result = await createBatch({
        doadorNome: doadorNome || undefined,
        livros: validos.map((l) => ({
          titulo: l.titulo,
          autores: l.autores,
          editora: l.editora,
          isbn: l.isbn,
          ano: l.ano,
          categorias: l.categorias || [],
          descricao: l.descricao,
          capaUrl: l.capaUrl,
          paginas: l.paginas,
          condicao: l.condicao,
        })),
      });
      toast.success(`${result.criados} livro(s) cadastrados`);
      router.push("/biblioteca");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setSalvando(false);
  }

  return (
    <ModuloGuard modulo="biblioteca">
      <div className="container max-w-3xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/biblioteca")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro em lote</CardTitle>
            <p className="text-sm text-muted-foreground">
              Escaneie ou digite os ISBNs sequencialmente. Os dados sao buscados no Google Books automaticamente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="doador">Doador (opcional)</Label>
              <Input
                id="doador"
                value={doadorNome}
                onChange={(e) => setDoadorNome(e.target.value)}
                placeholder="Nome do doador (aplica a todos os livros)"
              />
            </div>

            <div>
              <Label htmlFor="isbn">ISBN</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="isbn"
                    value={isbnInput}
                    onChange={(e) => setIsbnInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdicionar())}
                    placeholder="Digite ou escaneie ISBN..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <Button onClick={handleAdicionar} disabled={buscando || !isbnInput.trim()}>
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {livros.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">{livros.length} livro(s) na lista</p>
                {livros.map((l) => (
                  <Card key={l.tempId} className={l.status === "nao-encontrado" ? "border-yellow-300" : ""}>
                    <CardContent className="p-3 flex gap-3">
                      {l.capaUrl ? (
                        <img src={l.capaUrl} alt={l.titulo} className="w-12 h-16 object-cover rounded shrink-0" />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        {l.status === "nao-encontrado" ? (
                          <>
                            <Input
                              value={l.titulo}
                              onChange={(e) => atualizarLivro(l.tempId, { titulo: e.target.value })}
                              placeholder="Titulo"
                              className="h-8 text-xs"
                            />
                            <Input
                              value={l.autores.join(", ")}
                              onChange={(e) => atualizarLivro(l.tempId, { autores: e.target.value.split(",").map((a) => a.trim()).filter(Boolean) })}
                              placeholder="Autores (separe por virgula)"
                              className="h-8 text-xs"
                            />
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium line-clamp-1">{l.titulo}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{l.autores.join(", ")}</p>
                            <p className="text-xs text-muted-foreground font-mono">{l.isbn}</p>
                          </>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerLivro(l.tempId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {livros.length > 0 && (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setLivros([])}>
                  Limpar
                </Button>
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando ? "Salvando..." : `Cadastrar ${livros.length} livro(s)`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuloGuard>
  );
}
