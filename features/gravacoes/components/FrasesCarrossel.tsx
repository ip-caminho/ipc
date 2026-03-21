"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";
import { Quote, Headphones } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export function FrasesCarrossel() {
  // @ts-ignore Convex TS2589
  const allFrases = useQuery(api.gravacoes.queries.listFrases);

  const frase = useMemo(() => {
    if (!allFrases || allFrases.length === 0) return null;
    return allFrases[Math.floor(Math.random() * allFrases.length)];
  }, [allFrases]);

  if (!frase) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Palavra do dia</h2>
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="py-6 px-8">
          <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-4">
            <Quote className="h-6 w-6 text-primary/30" />
            <blockquote className="text-base leading-relaxed italic font-medium">
              {frase.frase}
            </blockquote>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">— {frase.pregador}</p>
              <p className="text-xs text-muted-foreground/70">{frase.titulo}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 mt-1" asChild>
              <Link href={`/gravacoes/${frase.gravacaoId}`}>
                <Headphones className="h-3 w-3" />
                Ouvir pregacao
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
