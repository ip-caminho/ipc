"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getSaoPauloDateString } from "@/convex/_shared/datetime";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Check, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { haptic } from "@shared/lib/haptic";
import { CONDICOES } from "@features/biblioteca/lib/constants";
import { pilula, pilulaDevolver } from "@features/biblioteca/lib/estilos";
import { formatarData, tempoFora } from "@features/biblioteca/lib/prancheta";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { CapaLivro } from "@features/biblioteca/components/CapaLivro";
import { LivroEditDialog } from "@features/biblioteca/components/LivroEditDialog";
import { ExemplarTimeline } from "@features/biblioteca/components/ExemplarTimeline";
import type { Id } from "@/convex/_generated/dataModel";

const SITUACAO_EXEMPLAR: Record<string, string> = {
  DISPONIVEL: "Na estante",
  EMPRESTADO: "Emprestado",
  PERDIDO: "Fora da estante",
  DANIFICADO: "Fora da estante",
};

function acervoDoExemplar(ex: { condicao: string; proprietarioNome?: string }): string {
  const estado = CONDICOES.find((c) => c.value === ex.condicao)?.label ?? ex.condicao;
  const dono = ex.proprietarioNome ? `de ${ex.proprietarioNome}` : "acervo da igreja";
  return `Estado: ${estado.toLowerCase()}, ${dono}`;
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
  const [devolvendo, setDevolvendo] = useState<Id<"emprestimos"> | null>(null);

  if (livro === undefined) return <div className="p-6">Carregando...</div>;
  if (livro === null) return <div className="p-6">Livro não encontrado</div>;

  const hoje = getSaoPauloDateString();
  const ativos = emprestimos?.filter((e) => e.status === "ATIVO") ?? [];
  const historico = emprestimos?.filter((e) => e.status === "DEVOLVIDO") ?? [];
  const podeEmprestar = can("biblioteca:emprestar");
  const total = livro.exemplares.length;

  const situacao =
    livro.disponiveis > 0
      ? total > 1
        ? `${livro.disponiveis} de ${total} na estante`
        : "Na estante"
      : ativos.length > 0
        ? "Emprestado"
        : "Fora da estante";

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

  async function registrarDevolucao(emprestimoId: Id<"emprestimos">, titulo: string) {
    setDevolvendo(emprestimoId);
    haptic(20);
    try {
      await devolverMut({ emprestimoId });
      toast.success(`${titulo} voltou para a estante`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao registrar a devolução");
    }
    setDevolvendo(null);
  }

  return (
    <ModuloGuard modulo="biblioteca">
      <HeaderLayout>
      <div className="container max-w-2xl pb-8">
        <div className="flex items-center justify-between">
          <DetailHeader backHref="/biblioteca" />
          {(can("biblioteca:update") || can("biblioteca:create")) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" aria-label="Mais ações do livro">
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {can("biblioteca:update") && (
                  <DropdownMenuItem className="min-h-11" onSelect={() => setEditando(true)}>
                    Editar livro
                  </DropdownMenuItem>
                )}
                {can("biblioteca:create") && (
                  <DropdownMenuItem
                    className="min-h-11"
                    onSelect={async () => {
                      await addExemplarMut({ livroId: id as Id<"livros">, condicao: "BOM" });
                      toast.success("Exemplar adicionado");
                    }}
                  >
                    Adicionar exemplar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="min-h-11">
                  <Link href={`/biblioteca/${id}/etiqueta`}>Imprimir etiquetas</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex justify-center rounded-2xl bg-muted py-8">
          <CapaLivro
            titulo={livro.titulo}
            capaUrl={livro.capaUrl}
            className="h-56 w-[9.5rem] shadow-xl [&>span:first-child]:text-base"
          />
        </div>

        <section className="pt-5">
          <h1 className="font-display text-2xl leading-tight">{livro.titulo}</h1>
          <p className="mt-1 text-muted-foreground">{livro.autores.join(", ")}</p>
          {(livro.editora || livro.ano) && (
            <p className="text-sm text-muted-foreground">
              {[livro.editora, livro.ano].filter(Boolean).join(", ")}
            </p>
          )}
          {livro.categorias.length > 0 && (
            <p className="text-sm text-muted-foreground">{livro.categorias.join(", ")}</p>
          )}
          <p
            className={
              livro.disponiveis > 0
                ? "mt-3 font-medium text-emerald-700 dark:text-emerald-400"
                : "mt-3 font-medium"
            }
          >
            {situacao}
          </p>
        </section>

        {podeEmprestar && livro.disponiveis > 0 && (
          <Button asChild className={`mt-4 h-12 w-full px-6 text-base md:h-11 md:w-auto md:text-sm ${pilula}`}>
            <Link href={`/biblioteca/emprestar?livro=${id}`}>Emprestar este livro</Link>
          </Button>
        )}

        {ativos.length > 0 && (
          <ul className="mt-3 divide-y rounded-xl bg-muted/60 px-4">
            {ativos.map((e) => (
              <li key={e._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.membroNome}</p>
                  <p className="text-sm text-muted-foreground">Pegou {tempoFora(e.dataEmprestimo, hoje)}</p>
                  {e.dataPrevistaDevolucao < hoje && (
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Prazo vencido</p>
                  )}
                </div>
                {podeEmprestar && (
                  <Button
                    variant="ghost"
                    className={`h-11 shrink-0 px-4 ${pilulaDevolver}`}
                    disabled={devolvendo === e._id}
                    onClick={() => registrarDevolucao(e._id, livro.titulo)}
                  >
                    <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    Devolveu
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {livro.descricao && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground line-clamp-6">
            {livro.descricao}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold">{total === 1 ? "Exemplar" : "Exemplares"}</h2>
          <ul className="mt-1 divide-y">
            {livro.exemplares.map((ex) => {
              const fora = ex.status === "PERDIDO" || ex.status === "DANIFICADO";
              return (
                <li key={ex._id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">
                        {ex.codigo}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {SITUACAO_EXEMPLAR[ex.status] ?? ex.status}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">{acervoDoExemplar(ex)}</p>
                      {ex.doadorNome && (
                        <p className="text-sm text-muted-foreground">Doado por {ex.doadorNome}</p>
                      )}
                      {ex.observacoes && <p className="text-sm text-muted-foreground">{ex.observacoes}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-full"
                          aria-label={`Mais ações do exemplar ${ex.codigo}`}
                        >
                          <MoreHorizontal className="h-5 w-5" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="min-h-11"
                          onSelect={() => setTimelineExemplarId(timelineExemplarId === ex._id ? null : ex._id)}
                        >
                          {timelineExemplarId === ex._id ? "Fechar histórico" : "Ver histórico"}
                        </DropdownMenuItem>
                        {podeEmprestar && fora && (
                          <DropdownMenuItem
                            className="min-h-11"
                            onSelect={async () => {
                              await voltarMut({ exemplarId: ex._id });
                              toast.success("Voltou para a estante");
                            }}
                          >
                            Voltou para a estante
                          </DropdownMenuItem>
                        )}
                        {podeEmprestar && !fora && (
                          <DropdownMenuItem
                            variant="destructive"
                            className="min-h-11"
                            onSelect={() => setRetirando(ex)}
                          >
                            Não está mais na estante
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {timelineExemplarId === ex._id && (
                    <div className="mt-3">
                      <ExemplarTimeline exemplarId={ex._id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {historico.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold">Quem já pegou</h2>
            <ul className="mt-1 divide-y">
              {historico.map((e) => (
                <li key={e._id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate">{e.membroNome}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {e.dataDevolucao ? formatarData(e.dataDevolucao) : formatarData(e.dataEmprestimo)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
              <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="rounded-full" onClick={retirarDaEstante}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
