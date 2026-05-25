"use client";

import Link from "next/link";
import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <Link
      href="/gravacoes"
      className="flex items-center gap-2 bg-secondary rounded-lg px-4 h-11 text-sm text-muted-foreground active:bg-secondary/80 transition-colors"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span>Buscar por titulo ou pregador</span>
    </Link>
  );
}
