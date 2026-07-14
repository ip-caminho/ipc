"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus, ExternalLink, Pencil } from "lucide-react";
import { RetiroConfigDialog } from "@features/retiro/components/RetiroConfigDialog";
import { dataBR, LABEL_QUARTO, TIPOS_QUARTO } from "@features/retiro/lib/format";

function Conteudo() {
  // @ts-ignore Convex TS2589
  const retiros = useQuery(api.retiro.queries.listar);
  const [configOpen, setConfigOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"retiros"> | undefined>(undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Inscrição especial por grupo: preços por faixa etária, quartos e fundo solidário.
        </p>
        <Button
          className="shrink-0 h-11 md:h-9"
          onClick={() => {
            setEditId(undefined);
            setConfigOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Novo retiro
        </Button>
      </div>

      {retiros === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : retiros.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum retiro criado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {retiros.map((a) => (
            <Card key={a._id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/retiro/${a._id}`} className="truncate font-medium hover:underline">
                      {a.titulo}
                    </Link>
                    <Badge variant={a.ativa ? "default" : "secondary"}>
                      {a.ativa ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dataBR(a.dataInicio)} a {dataBR(a.dataFim)} ·{" "}
                    {TIPOS_QUARTO.filter((t) => a.estoque[t] > 0)
                      .map((t) => `${LABEL_QUARTO[t]} ${a.reservados[t]}/${a.estoque[t]}`)
                      .join(" · ") || "sem estoque"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm" className="h-11 md:h-8">
                    <Link href={`/admin/retiro/${a._id}`}>Inscrições</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 md:h-8"
                    onClick={() => {
                      setEditId(a._id);
                      setConfigOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Config
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-11 md:h-8">
                    <a href={`/retiro/${a.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="sr-only">Abrir página pública</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RetiroConfigDialog open={configOpen} onOpenChange={setConfigOpen} retiroId={editId} />
    </div>
  );
}

export default function RetiroAdminPage() {
  return (
    <PermissionGate
      permission="inscricoes:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <HeaderLayout>
        <PageHeader title="Retiro" />
        <div className="mt-4">
          <Conteudo />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
