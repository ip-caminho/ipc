"use client";

import Link from "next/link";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { BookOpen } from "lucide-react";

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
  return (
    <Link href={`/biblioteca/${livro._id}`}>
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="p-4 flex gap-3">
          {livro.capaUrl ? (
            <img src={livro.capaUrl} alt={livro.titulo} className="w-12 h-16 object-cover rounded" />
          ) : (
            <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-medium text-sm leading-tight line-clamp-2">{livro.titulo}</h3>
            <p className="text-xs text-muted-foreground truncate">{livro.autores.join(", ")}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={
                livro.disponiveis > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              }>
                {livro.disponiveis}/{livro.totalExemplares} disponíveis
              </Badge>
              {livro.categorias.slice(0, 2).map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
