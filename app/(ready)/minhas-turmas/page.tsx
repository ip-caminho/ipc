"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { GraduationCap, Users, ChevronRight } from "lucide-react";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { STATUS_TURMA, DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/**
 * Consulta do instrutor. Sem ModuloGuard nem PermissionGate: o acesso vem do
 * vinculo (ser instrutor da turma), verificado na query. Quem nao da aula ve a
 * pagina vazia.
 */
export default function MinhasTurmasPage() {
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turmas = useQuery(api.turmas.instrutor.minhasTurmas, {});

  return (
    <HeaderLayout>
      <div className="container max-w-2xl py-6 space-y-4">
        <PageHeader title="Minhas turmas" />

        {!turmas ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Você não é instrutor de nenhuma turma no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {turmas.map((t) => {
              const statusOpt = STATUS_TURMA.find((s) => s.value === t.status);
              return (
                <Card key={t._id} className="transition-colors hover:bg-accent/50">
                  <CardContent className="p-4">
                    <Link href={`/minhas-turmas/${t._id}`} className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold truncate">{t.nome}</span>
                          <Badge variant="secondary" className={statusOpt?.color}>
                            {statusOpt?.label ?? t.status}
                          </Badge>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {t.totalConfirmados}{" "}
                            {t.totalConfirmados === 1 ? "inscrito" : "inscritos"}
                          </span>
                          <span>
                            {formatDate(t.dataInicio)}
                            {t.diaSemana &&
                              ` · ${DIA_SEMANA_LABELS[t.diaSemana] ?? t.diaSemana}`}
                            {t.horario && ` ${t.horario}`}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </HeaderLayout>
  );
}
