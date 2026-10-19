"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AvisosCuradoria } from "@features/site-publico/components/AvisosCuradoria";

function formatDataBR(data?: string): string {
  if (!data) return "";
  const [y, m, d] = data.split("-");
  return d && m ? `${d}/${m}/${y}` : data;
}

// Painel "Avisos" do hub do site público. Curadoria dos avisos do último culto
// (extraídos pela IA) que alimentam o bloco "Esta semana" na home.
export function AvisosPanel() {
  // @ts-ignore Convex TS2589
  const info = useQuery(api.site.queries.getGravacaoDoSite);
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        O bloco “Esta semana” na home mostra os avisos do último culto, extraídos
        automaticamente do áudio. Corrija aqui o que a transcrição entendeu errado. Os
        avisos cadastrados em{" "}
        <Link href="/avisos" className="underline">
          Avisos
        </Link>{" "}
        são pauta interna e <strong>não</strong> aparecem no site.
      </p>
      {info === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : info === null ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum culto publicado com avisos processados ainda. Assim que um culto for
            processado pela IA, os avisos aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Culto de {formatDataBR(info.data)}
            </p>
            <Button asChild variant="outline" size="sm" className="h-11 md:h-8">
              <Link href={`/gravacoes/${info.gravacaoId}/admin`}>Abrir gravação</Link>
            </Button>
          </div>
          <AvisosCuradoria gravacaoId={info.gravacaoId} avisos={info.avisos} />
        </>
      )}
    </div>
  );
}
