"use client";

import { Search } from "lucide-react";
import Link from "next/link";

/**
 * Entry point para busca global. Leva para a tela de resultados.
 * Por enquanto é apenas um link visual — a tela de busca é fase 2.
 */
export function SearchBar() {
  return (
    <Link
      href="/comunidade/busca"
      className="flex items-center gap-2 bg-secondary rounded-md px-3 h-11 text-sm text-muted-foreground active:opacity-80 transition-opacity"
      aria-label="Buscar conteúdo"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span>Buscar sermões, músicas, pessoas</span>
    </Link>
  );
}
