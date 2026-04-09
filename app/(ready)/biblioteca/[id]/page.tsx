"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { STATUS_EXEMPLAR } from "@features/biblioteca/lib/constants";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import type { Id } from "@/convex/_generated/dataModel";

export default function LivroDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const livro = useQuery(api.biblioteca.queries.getById, { id: id as Id<"livros"> });
  const emprestimos = useQuery(api.biblioteca.queries.listEmprestimos, { livroId: id as Id<"livros">, status: "ATIVO" });
  const devolverMut = useMutation(api.biblioteca.mutations.devolver);
  const addExemplarMut = useMutation(api.biblioteca.mutations.addExemplar);

  if (livro === undefined) return <div className="p-6">Carregando...</div>;
  if (livro === null) return <div className="p-6">Livro nao encontrado</div>;

  return (
    <ModuloGuard modulo="biblioteca">
      <div className="container max-w-3xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/biblioteca")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              {livro.capaUrl ? (
                <img src={livro.capaUrl} alt={livro.titulo} className="w-24 h-32 object-cover rounded" />
              ) : (
                <div className="w-24 h-32 bg-muted rounded flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{livro.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground">{livro.autores.join(", ")}</p>
                {livro.editora && <p className="text-xs text-muted-foreground">{livro.editora} {livro.ano && `(${livro.ano})`}</p>}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {livro.categorias.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {livro.descricao && <p className="text-sm mb-4">{livro.descricao}</p>}
            <p className="text-sm font-medium mb-2">
              Exemplares ({livro.disponiveis} de {livro.exemplares.length} disponíveis)
            </p>
            <div className="space-y-2">
              {livro.exemplares.map((ex) => {
                const statusOpt = STATUS_EXEMPLAR.find((s) => s.value === ex.status);
                return (
                  <div key={ex._id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div>
                      <span className="font-mono">{ex.codigo}</span>
                      <span className="text-muted-foreground ml-2">{ex.condicao}</span>
                    </div>
                    <Badge variant="outline" className={statusOpt?.color ?? ""}>
                      {statusOpt?.label ?? ex.status}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {can("biblioteca:create") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  await addExemplarMut({ livroId: id as Id<"livros">, condicao: "BOM" });
                  toast.success("Exemplar adicionado");
                }}
              >
                + Adicionar exemplar
              </Button>
            )}
          </CardContent>
        </Card>

        {emprestimos && emprestimos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Empréstimos ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {emprestimos.map((e: any) => (
                <div key={e._id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div>
                    <p className="font-medium">{e.membroNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.exemplarCodigo} - Devolução: {e.dataPrevistaDevolucao}
                      {e.atrasado && <span className="text-red-500 ml-1 font-medium">ATRASADO</span>}
                    </p>
                  </div>
                  {can("biblioteca:emprestar") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await devolverMut({ emprestimoId: e._id });
                        toast.success("Devolvido");
                      }}
                    >
                      Devolver
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ModuloGuard>
  );
}
