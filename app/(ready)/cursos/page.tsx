"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { CursoFormDialog } from "@features/turmas/components/CursoFormDialog";
import { STATUS_CURSO } from "@features/turmas/lib/constants";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export default function CursosPage() {
  const cursos = useQuery(api.cursos.queries.list, {});
  const setStatus = useMutation(api.cursos.mutations.setStatus);

  const [formOpen, setFormOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Doc<"cursos"> | undefined>();

  function abrirNovo() {
    setEmEdicao(undefined);
    setFormOpen(true);
  }

  function abrirEdicao(curso: Doc<"cursos">) {
    setEmEdicao(curso);
    setFormOpen(true);
  }

  async function alternarStatus(curso: Doc<"cursos">) {
    try {
      await setStatus({
        id: curso._id as Id<"cursos">,
        status: curso.status === "ATIVO" ? "INATIVO" : "ATIVO",
      });
      toast.success(curso.status === "ATIVO" ? "Curso inativado" : "Curso reativado");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  return (
    <ModuloGuard modulo="turmas">
      <HeaderLayout>
        <div className="container max-w-4xl py-6 space-y-4">
          <PageHeader title="Cursos" />

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              O catalogo. Cada turma e uma oferta datada de um curso.
            </p>
            <PermissionGate permission="turmas:create">
              <Button onClick={abrirNovo} size="sm" className="h-10 shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Novo curso
              </Button>
            </PermissionGate>
          </div>

          {!cursos ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : cursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum curso cadastrado. Crie um para poder abrir turmas dele.
            </p>
          ) : (
            <div className="space-y-3">
              {cursos.map((curso) => {
                const statusOpt = STATUS_CURSO.find((s) => s.value === curso.status);
                return (
                  <Card key={curso._id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{curso.nome}</p>
                          {curso.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {curso.descricao}
                            </p>
                          )}
                        </div>
                        <Badge className={statusOpt?.color} variant="secondary">
                          {statusOpt?.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>Frequencia minima: {curso.frequenciaMinima}%</span>
                        {curso.totalAulas ? <span>{curso.totalAulas} aulas</span> : null}
                        {curso.cargaHoraria ? <span>{curso.cargaHoraria}h</span> : null}
                      </div>

                      <PermissionGate permission="turmas:update">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10"
                            onClick={() => abrirEdicao(curso)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10"
                            onClick={() => alternarStatus(curso)}
                          >
                            {curso.status === "ATIVO" ? "Inativar" : "Reativar"}
                          </Button>
                        </div>
                      </PermissionGate>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </HeaderLayout>

      <CursoFormDialog open={formOpen} onOpenChange={setFormOpen} curso={emEdicao} />
    </ModuloGuard>
  );
}
