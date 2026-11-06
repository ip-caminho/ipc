"use client";

import Link from "next/link";
import { CapaLivro } from "@features/biblioteca/components/CapaLivro";

interface LivroCardProps {
  livro: {
    _id: string;
    titulo: string;
    autores: string[];
    capaUrl?: string;
    categorias: string[];
    totalExemplares: number;
    disponiveis: number;
  };
}

export function LivroCard({ livro }: LivroCardProps) {
  const naEstante = livro.disponiveis > 0;
  return (
    <Link
      href={`/biblioteca/${livro._id}`}
      className="flex gap-4 rounded-lg p-2 transition-colors hover:bg-accent/50 active:bg-accent/50"
    >
      <CapaLivro titulo={livro.titulo} capaUrl={livro.capaUrl} className="h-24 w-16" />
      <div className="min-w-0 flex-1">
        <h3 className="font-display line-clamp-2 text-base leading-snug">{livro.titulo}</h3>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{livro.autores.join(", ")}</p>
        <p className={naEstante ? "mt-1 text-sm text-emerald-700 dark:text-emerald-400" : "mt-1 text-sm text-muted-foreground"}>
          {naEstante ? "Na estante" : "Fora da estante"}
        </p>
      </div>
    </Link>
  );
}
