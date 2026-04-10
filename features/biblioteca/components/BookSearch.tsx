"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

interface GoogleBook {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

export interface BookData {
  titulo: string;
  autores: string[];
  editora?: string;
  isbn?: string;
  ano?: number;
  descricao?: string;
  paginas?: number;
  capaUrl?: string;
  categorias?: string[];
  idioma?: string;
}

interface BookSearchProps {
  onSelect: (book: BookData) => void;
}

function isISBN(query: string): boolean {
  const clean = query.replace(/[^0-9X]/gi, "");
  return clean.length === 10 || clean.length === 13;
}

function bookFromGoogle(g: GoogleBook): BookData {
  const v = g.volumeInfo;
  const isbn = v.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13" || id.type === "ISBN_10"
  )?.identifier;
  const ano = v.publishedDate ? parseInt(v.publishedDate.split("-")[0]) : undefined;
  // Upgrade thumbnail to higher resolution and force https
  const capaUrl = v.imageLinks?.thumbnail
    ?.replace("http://", "https://")
    ?.replace("&edge=curl", "");
  return {
    titulo: v.title || "",
    autores: v.authors || [],
    editora: v.publisher,
    isbn,
    ano,
    descricao: v.description,
    paginas: v.pageCount,
    capaUrl,
    categorias: v.categories,
    idioma: v.language === "pt" ? "Portugues" : v.language,
  };
}

export function BookSearch({ onSelect }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const q = isISBN(query) ? `isbn:${query.replace(/[^0-9X]/gi, "")}` : query;
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&langRestrict=pt`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.items || []);
      } catch (e) {
        setError("Erro ao buscar livros");
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ISBN ou titulo..."
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((g) => {
            const v = g.volumeInfo;
            const thumb = v.imageLinks?.thumbnail?.replace("http://", "https://");
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(bookFromGoogle(g))}
                className="w-full text-left flex gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                {thumb ? (
                  <img src={thumb} alt={v.title} className="w-12 h-16 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {v.authors?.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.publisher}{v.publishedDate && ` · ${v.publishedDate.split("-")[0]}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {query.trim().length >= 3 && !loading && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum livro encontrado
        </p>
      )}
    </div>
  );
}
