"use client";

import { Search } from "lucide-react";

/**
 * Entry point para busca global. A tela de busca e fase 2 — por enquanto
 * apresentamos o input desabilitado em vez de um link para uma rota
 * inexistente (evita redirect silencioso para /dashboard).
 */
export function SearchBar() {
  return (
    <div
      className="flex items-center gap-2 bg-secondary/60 rounded-md px-3 h-11 text-sm text-muted-foreground/70 cursor-not-allowed select-none"
      aria-disabled="true"
      title="Busca disponivel em breve"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span>Buscar por título ou pregador (em breve)</span>
    </div>
  );
}
