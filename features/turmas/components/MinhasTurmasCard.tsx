"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { GraduationCap, Users, ChevronRight } from "lucide-react";

/**
 * Atalho do instrutor para a consulta da turma (quem se inscreveu e o que
 * respondeu). Se esconde sozinho para quem nao da aula — mesmo padrao do
 * ChamadaWidget, e o motivo de nao existir item de menu para isso.
 */
export function MinhasTurmasCard() {
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turmas = useQuery(api.turmas.instrutor.minhasTurmas, {});

  if (!turmas || turmas.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Minhas turmas</h2>
      {turmas.map((t) => (
        <Card key={t._id} className="transition-colors hover:bg-accent/50">
          <CardContent className="p-4">
            <Link href={`/minhas-turmas/${t._id}`} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm truncate">{t.nome}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t.totalConfirmados} {t.totalConfirmados === 1 ? "inscrito" : "inscritos"} ·
                  ver quem se inscreveu
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
