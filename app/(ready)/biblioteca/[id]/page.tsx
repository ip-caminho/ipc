"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { BookOpen, Pencil, Plus, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { STATUS_EXEMPLAR } from "@features/biblioteca/lib/constants";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { LivroEditDialog } from "@features/biblioteca/components/LivroEditDialog";
import { ExemplarTimeline } from "@features/biblioteca/components/ExemplarTimeline";
import type { Id } from "@/convex/_generated/dataModel";

function formatDateBR(d?: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function LivroDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const livro = useQuery(api.biblioteca.queries.getById, { id: id as Id<"livros"> });
  const emprestimos = useQuery(api.biblioteca.queries.listEmprestimos, { livroId: id as Id<"livros"> });
  const devolverMut = useMutation(api.biblioteca.mutations.devolver);
  const addExemplarMut = useMutation(api.biblioteca.mutations.addExemplar);
  const retirarMut = useMutation(api.biblioteca.mutations.retirarDaEstante);
  const voltarMut = useMutation(api.biblioteca.mutations.voltarParaEstante);

  const [editando, setEditando] = useState(false);
  const [retirando, setRetirando] = useState<{ _id: Id<"exemplares">; codigo: string; status: string } | null>(null);
  const [timelineExemplarId, setTimelineExemplarId] = useState<string | null>(null);

  if (livro === undefined) return <div className="p-6">Carregando...</div>;
  if (livro === null) return <div className="p-6">Livro nao encontrado</div>;

  const ativos = emprestimos?.filter((e: any) => e.status === "ATIVO") || [];
  const historicoEmprestimos = emprestimos?.filter((e: any) => e.status === "DEVOLVIDO") || [];

  async function retirarDaEstante() {
    if (!retirando) return;
    try {
      await retirarMut({ exemplarId: retirando._id });
      toast.success("Saiu da estante");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao registrar");
    }
    setRetirando(null);
  }

  return (
    <ModuloGuard modulo="biblioteca">
      <HeaderLayout>
      <div className="container max-w-3xl py-6 space-y-4">
        <DetailHeader backHref="/biblioteca" />

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              {livro.capaUrl ? (
                <img src={livro.capaUrl} alt={livro.titulo} className="w-24 h-32 object-cover rounded shrink-0" />
              ) : (
                <div className="w-24 h-32 bg-muted rounded flex items-center justify-center shrink-0">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl">{livro.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground">{livro.autores.join(", ")}</p>
                {livro.editora && <p className="text-xs text-muted-foreground">{livro.editora} {livro.ano && `(${livro.ano})`}</p>}
                {livro.isbn && <p className="text-xs text-muted-foreground font-mono">ISBN: {livro.isbn}</p>}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {livro.categorias.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {livro.descricao && (
              <p className="text-sm mt-4 text-muted-foreground line-clamp-4">{livro.descricao}</p>
            )}

            {/* Acoes */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {can("biblioteca:emprestar") && livro.disponiveis > 0 && (
                <Button asChild size="sm" className="h-11 md:h-8">
                  <Link href={`/biblioteca/emprestar?livro=${id}`}>Emprestar</Link>
                </Button>
              )}
              {can("biblioteca:update") && (
                <Button variant="outline" size="sm" className="h-11 md:h-8" onClick={() => setEditando(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              )}
              {can("biblioteca:create") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 md:h-8"
                  onClick={async () => {
                    await addExemplarMut({ livroId: id as Id<"livros">, condicao: "BOM" });
                    toast.success("Exemplar adicionado");
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Exemplar
                </Button>
              )}
              <Link href={`/biblioteca/${id}/etiqueta`}>
                <Button variant="outline" size="sm" className="h-11 md:h-8">
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  Etiquetas
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="exemplares">
          <TabsList>
            <TabsTrigger value="exemplares">
              Exemplares ({livro.exemplares.length})
            </TabsTrigger>
            <TabsTrigger value="emprestimos">
              Empréstimos {ativos.length > 0 && `(${ativos.length})`}
            </TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="exemplares" className="mt-4 space-y-2">
            {livro.exemplares.map((ex) => {
              const statusOpt = STATUS_EXEMPLAR.find((s) => s.value === ex.status);
              return (
                <Card key={ex._id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-medium">{ex.codigo}</span>
                        <span className="text-xs text-muted-foreground ml-2">{ex.condicao}</span>
                        <p className="text-xs text-muted-foreground">
                          {ex.proprietarioNome ? `Proprietário: ${ex.proprietarioNome}` : "Acervo da igreja"}
                        </p>
                        {ex.doadorNome && (
                          <p className="text-xs text-muted-foreground">Doador: {ex.doadorNome}</p>
                        )}
                        {ex.observacoes && (
                          <p className="text-xs text-muted-foreground">{ex.observacoes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusOpt?.color ?? ""}>
                          {statusOpt?.label ?? ex.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 md:h-8"
                          onClick={() => setTimelineExemplarId(timelineExemplarId === ex._id ? null : ex._id)}
                        >
                          {timelineExemplarId === ex._id ? "Fechar" : "Timeline"}
                        </Button>
                      </div>
                    </div>

                    {can("biblioteca:emprestar") && (
                      <div className="mt-2 flex justify-end">
                        {ex.status === "PERDIDO" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-11 md:h-8"
                            onClick={async () => {
                              await voltarMut({ exemplarId: ex._id });
                              toast.success("Voltou para a estante");
                            }}
                          >
                            Voltou para a estante
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 text-destructive md:h-8"
                            onClick={() => setRetirando(ex)}
                          >
                            Não está mais na estante
                          </Button>
                        )}
                      </div>
                    )}

                    {timelineExemplarId === ex._id && (
                      <div className="border-t mt-3 pt-3">
                        <ExemplarTimeline exemplarId={ex._id as Id<"exemplares">} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="emprestimos" className="mt-4 space-y-2">
            {ativos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum empréstimo ativo
              </p>
            ) : (
              ativos.map((e: any) => (
                <Card key={e._id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{e.membroNome}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{e.exemplarCodigo}</span>
                        {" · Devolução: "}{formatDateBR(e.dataPrevistaDevolucao)}
                        {e.atrasado && <span className="text-red-500 ml-1 font-medium">ATRASADO</span>}
                      </p>
                    </div>
                    {can("biblioteca:emprestar") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 md:h-8"
                        onClick={async () => {
                          await devolverMut({ emprestimoId: e._id });
                          toast.success("Devolvido");
                        }}
                      >
                        Devolver
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4 space-y-2">
            {historicoEmprestimos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum empréstimo no histórico
              </p>
            ) : (
              historicoEmprestimos.map((e: any) => (
                <Card key={e._id}>
                  <CardContent className="p-3">
                    <p className="text-sm">{e.membroNome}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{e.exemplarCodigo}</span>
                      {" · "}{formatDateBR(e.dataEmprestimo)} → {formatDateBR(e.dataDevolucao)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {editando && <LivroEditDialog livro={livro} onClose={() => setEditando(false)} />}

        <AlertDialog open={retirando !== null} onOpenChange={(aberto) => !aberto && setRetirando(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{retirando?.codigo} não está mais na estante?</AlertDialogTitle>
              <AlertDialogDescription>
                {retirando?.status === "EMPRESTADO"
                  ? "O empréstimo será encerrado e o exemplar sai da consulta pública. Dá para desfazer depois."
                  : "O exemplar sai da consulta pública. Dá para desfazer depois."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={retirarDaEstante}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
