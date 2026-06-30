"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AvisosCuradoria } from "@features/site-publico/components/AvisosCuradoria";

function formatDataBR(data?: string): string {
  if (!data) return "";
  const [y, m, d] = data.split("-");
  return d && m ? `${d}/${m}/${y}` : data;
}

function AvisosSite() {
  // @ts-ignore Convex TS2589
  const info = useQuery(api.site.queries.getGravacaoDoSite);
  return (
    <HeaderLayout>
      <PageHeader title="Avisos do site" />
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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Culto de {formatDataBR(info.data)} ·{" "}
              <Link href={`/gravacoes/${info.gravacaoId}/admin`} className="underline">
                abrir gravação
              </Link>
            </p>
            <AvisosCuradoria gravacaoId={info.gravacaoId} avisos={info.avisos} />
          </>
        )}
      </div>
    </HeaderLayout>
  );
}

export default function AvisosSitePage() {
  return (
    <PermissionGate
      permission="site_publico:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <AvisosSite />
    </PermissionGate>
  );
}
