"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getSaoPauloDateString } from "@/convex/_shared/datetime";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { linkLembrete, tempoFora } from "@features/biblioteca/lib/prancheta";

function resumo(total: number): string {
  if (total === 0) return "Todos os livros estão na estante";
  return total === 1 ? "1 livro fora da estante" : `${total} livros fora da estante`;
}

export function Prancheta() {
  const { can } = useAuth();
  const ativos = useQuery(api.biblioteca.queries.listAtivos);
  const devolver = useMutation(api.biblioteca.mutations.devolver);
  const [devolvendo, setDevolvendo] = useState<Id<"emprestimos"> | null>(null);
  const hoje = getSaoPauloDateString();

  async function registrarDevolucao(id: Id<"emprestimos">, titulo: string) {
    setDevolvendo(id);
    try {
      await devolver({ emprestimoId: id });
      toast.success(`${titulo} voltou para a estante`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao registrar a devolução");
    }
    setDevolvendo(null);
  }

  return (
    <HeaderLayout>
      <div className="container max-w-4xl py-6 space-y-4">
        <PageHeader
          title="Biblioteca"
          subtitle={ativos ? resumo(ativos.length) : undefined}
          action={
            <Button asChild className="h-12 md:h-9">
              <Link href="/biblioteca/emprestar">Emprestar livro</Link>
            </Button>
          }
        />

        {ativos === undefined ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            {ativos.map((e) => {
              const atrasado = e.dataPrevistaDevolucao < hoje;
              return (
                <Card key={e._id} className="py-0">
                  <CardContent className="space-y-3 p-3">
                    <Link href={`/biblioteca/${e.livroId}`} className="block min-w-0">
                      <p className="truncate font-medium">{e.livroTitulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.pessoa} · {tempoFora(e.dataEmprestimo, hoje)}
                      </p>
                      {atrasado && (
                        <p className="text-sm font-medium text-destructive">Passou do prazo</p>
                      )}
                    </Link>
                    <div className="flex gap-2">
                      {atrasado && e.whatsapp && (
                        <Button asChild variant="outline" className="h-11 flex-1">
                          <a
                            href={linkLembrete({ ...e, whatsapp: e.whatsapp })}
                            target="_blank"
                            rel="noopener"
                          >
                            Lembrar no WhatsApp
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="h-11 flex-1 border-primary text-primary"
                        disabled={devolvendo === e._id}
                        onClick={() => registrarDevolucao(e._id, e.livroTitulo)}
                      >
                        Devolveu
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="ghost" className="h-11 text-primary">
            <Link href="/biblioteca?ver=livros">Ver todos os livros</Link>
          </Button>
          {can("biblioteca:create") && (
            <Button asChild variant="ghost" className="h-11 text-primary">
              <Link href="/biblioteca/novo">Cadastrar livro</Link>
            </Button>
          )}
        </div>
      </div>
    </HeaderLayout>
  );
}
