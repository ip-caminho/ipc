"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { BookOpen } from "lucide-react";

const CAMPO_LABEL: Record<string, string> = {
  dataBatismo: "Batismo",
  dataConversao: "Conversao / Profissao de Fe",
  dataMembresia: "Data de Membresia",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AtosPastoraisDashboard() {
  const { isAdmin, isLoading } = useAuth();
  const pendentes = useQuery(api.atosPastorais.queries.pendentesVerificacao);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Acesso restrito.</p>
          </CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout>
      <PageHeader title="Atos Pastorais" />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Pendentes de verificacao ({pendentes?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Membros que marcaram dados sacramentais como incertos. Consulte o
              livro fisico de registros e clique no membro para registrar o ato pastoral.
            </p>
            {pendentes === undefined ? (
              <Skeleton className="h-32 w-full" />
            ) : pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma verificacao pendente.
              </p>
            ) : (
              <ul className="divide-y">
                {pendentes.map((p) => (
                  <li key={p.membroId}>
                    <Link
                      href={`/membros/${p.membroId}`}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.foto} />
                        <AvatarFallback>{initials(p.nomeCompleto)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{p.nomeCompleto}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {p.camposIncertos.map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px]">
                              {CAMPO_LABEL[c] ?? c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </HeaderLayout>
  );
}
