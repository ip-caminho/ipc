"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { InscricaoBuilder } from "@features/site-publico/components/InscricaoBuilder";

function formatData(ts?: number): string {
  if (ts == null) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function InscricoesAdmin() {
  // @ts-ignore Convex TS2589
  const inscricoes = useQuery(api.inscricoesEvento.queries.listarTodas);
  const encerrar = useMutation(api.inscricoesEvento.mutations.encerrar);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"inscricoesEvento"> | undefined>(undefined);

  function novaInscricao() {
    setEditId(undefined);
    setBuilderOpen(true);
  }
  function editar(id: Id<"inscricoesEvento">) {
    setEditId(id);
    setBuilderOpen(true);
  }
  async function handleEncerrar(id: Id<"inscricoesEvento">) {
    if (!confirm("Encerrar esta inscrição? Ela deixa de aparecer no site.")) return;
    try {
      await encerrar({ id });
      toast.success("Inscrição encerrada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao encerrar");
    }
  }

  return (
    <HeaderLayout>
      <PageHeader title="Inscrições do site" />
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={novaInscricao}>
            <Plus className="mr-1 h-4 w-4" /> Nova inscrição
          </Button>
        </div>

        {inscricoes === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : inscricoes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma inscrição criada ainda. Clique em “Nova inscrição” para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {inscricoes.map((i) => (
              <Card key={i._id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{i.titulo}</p>
                      <Badge variant={i.ativa ? "default" : "secondary"}>
                        {i.ativa ? "Ativa" : "Encerrada"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      /inscricoes/{i.slug} · Até {formatData(i.dataLimite)} ·{" "}
                      {i.vagas != null ? `${i.vagasOcupadas}/${i.vagas} vagas` : `${i.vagasOcupadas} inscritos`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/site-publico/inscricoes/${i._id}/respostas`}>
                        <Users className="mr-1 h-3.5 w-3.5" /> Respostas
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editar(i._id)}>
                      Editar
                    </Button>
                    {i.ativa && (
                      <Button variant="ghost" size="sm" onClick={() => handleEncerrar(i._id)}>
                        Encerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {builderOpen && (
        <InscricaoBuilder
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          inscricaoId={editId}
        />
      )}
    </HeaderLayout>
  );
}

export default function InscricoesAdminPage() {
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
      <InscricoesAdmin />
    </PermissionGate>
  );
}
