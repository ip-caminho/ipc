"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_EXECUCAO: "Em execucao",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluida",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  RASCUNHO: "outline",
  EM_EXECUCAO: "default",
  PAUSADA: "secondary",
  CONCLUIDA: "secondary",
};

export default function CampanhasPage() {
  const { isAdmin, isLoading } = useAuth();
  const campanhas = useQuery(api.messaging.campanhas.listCampanhas);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PageHeader title="Campanhas" />
        <Link href="/admin/campanhas/nova">
          <Button>
            <Plus className="h-4 w-4 mr-1" /> Nova campanha
          </Button>
        </Link>
      </div>

      {campanhas === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : campanhas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma campanha criada ainda.</p>
            <Link href="/admin/campanhas/nova">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-1" /> Criar primeira campanha
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campanhas.map((c) => {
            const taxa = c.stats.total > 0
              ? Math.round((c.stats.atualizaram / c.stats.total) * 100)
              : 0;
            return (
              <Link key={c._id} href={`/admin/campanhas/${c._id}`}>
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium truncate">{c.titulo}</h3>
                          <Badge variant={STATUS_VARIANT[c.status]}>
                            {STATUS_LABEL[c.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criada {format(c.criadoEm, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {c.stats.atualizaram}/{c.stats.total}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {taxa}% atualizaram
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </HeaderLayout>
  );
}
