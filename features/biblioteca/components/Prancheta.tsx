"use client";

import { useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Check, MessageCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getSaoPauloDateString } from "@/convex/_shared/datetime";
import { Button } from "@/shared/components/ui/button";
import { MobileFab } from "@shared/components/layout/MobileFab";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { haptic } from "@shared/lib/haptic";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { CapaLivro } from "@features/biblioteca/components/CapaLivro";
import { pilula, pilulaDevolver, pilulaLembrar, pilulaTexto } from "@features/biblioteca/lib/estilos";
import { linkLembrete, tempoFora } from "@features/biblioteca/lib/prancheta";

function resumo(total: number, atrasados: number): string {
  if (total === 0) return "Todos os livros estão na estante";
  const fora = total === 1 ? "1 livro fora da estante" : `${total} livros fora da estante`;
  if (atrasados === 0) return fora;
  return `${fora}, ${atrasados} com prazo vencido`;
}

export function Prancheta() {
  const { can } = useAuth();
  // @ts-ignore Convex TS2589
  const ativos = useQuery(api.biblioteca.queries.listAtivos);
  // A linha sai no toque, sem esperar o servidor; se falhar, o Convex a devolve sozinho.
  const devolver = useMutation(api.biblioteca.mutations.devolver).withOptimisticUpdate(
    (store, { emprestimoId }) => {
      const atuais = store.getQuery(api.biblioteca.queries.listAtivos, {});
      if (!atuais) return;
      store.setQuery(
        api.biblioteca.queries.listAtivos,
        {},
        atuais.filter((e) => e._id !== emprestimoId)
      );
    }
  );
  // A linha continua clicável enquanto encolhe: evita registrar a devolução duas vezes.
  const devolvidos = useRef(new Set<Id<"emprestimos">>());
  const reduzirMovimento = useReducedMotion();
  const saida = reduzirMovimento
    ? { opacity: 0 }
    : { opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 };
  const transicaoSaida = reduzirMovimento
    ? { duration: 0.15 }
    : ({ type: "spring", bounce: 0, duration: 0.35 } as const);
  const hoje = getSaoPauloDateString();

  const atrasados = ativos?.filter((e) => e.dataPrevistaDevolucao < hoje) ?? [];
  const noPrazo = ativos?.filter((e) => e.dataPrevistaDevolucao >= hoje) ?? [];

  async function registrarDevolucao(id: Id<"emprestimos">, titulo: string) {
    if (devolvidos.current.has(id)) return;
    devolvidos.current.add(id);
    haptic(20);
    try {
      await devolver({ emprestimoId: id });
      toast.success(`${titulo} voltou para a estante`);
    } catch (err: unknown) {
      devolvidos.current.delete(id);
      toast.error((err as Error).message || "Erro ao registrar a devolução");
    }
  }

  function linha(e: NonNullable<typeof ativos>[number], atrasado: boolean) {
    return (
      <motion.li key={e._id} exit={saida} transition={transicaoSaida} className="flex gap-4 overflow-y-clip py-4">
        <Link href={`/biblioteca/${e.livroId}`} tabIndex={-1} aria-hidden>
          <CapaLivro titulo={e.livroTitulo} capaUrl={e.capaUrl} className="h-[6.5rem] w-[4.5rem]" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/biblioteca/${e.livroId}`} className="min-w-0">
            <p className="font-display line-clamp-2 text-lg leading-snug">{e.livroTitulo}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {e.pessoa}, {tempoFora(e.dataEmprestimo, hoje)}
            </p>
          </Link>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button
              variant="ghost"
              className={`h-11 px-4 ${pilulaDevolver}`}
              onClick={() => registrarDevolucao(e._id, e.livroTitulo)}
            >
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              Devolveu
            </Button>
            {atrasado && e.whatsapp && (
              <Button asChild variant="ghost" className={`h-11 px-4 ${pilulaLembrar}`}>
                <a href={linkLembrete({ ...e, whatsapp: e.whatsapp })} target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  Lembrar
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.li>
    );
  }

  return (
    <HeaderLayout>
      <div className="container max-w-2xl py-6 pb-24 space-y-6 md:pb-6">
        <PageHeader
          title="Biblioteca"
          subtitle={ativos ? resumo(ativos.length, atrasados.length) : undefined}
          action={
            <Button asChild className={`hidden h-11 px-6 md:inline-flex ${pilula}`}>
              <Link href="/biblioteca/emprestar">Emprestar livro</Link>
            </Button>
          }
        />

        {ativos === undefined && <p className="text-sm text-muted-foreground">Carregando...</p>}

        <AnimatePresence initial={false}>
          {atrasados.length > 0 && (
            <motion.section key="vencidos" exit={saida} transition={transicaoSaida} className="overflow-y-clip">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Prazo vencido</h2>
              <ul className="divide-y">
                <AnimatePresence initial={false}>{atrasados.map((e) => linha(e, true))}</AnimatePresence>
              </ul>
            </motion.section>
          )}

          {noPrazo.length > 0 && (
            <motion.section key="noPrazo" exit={saida} transition={transicaoSaida} className="overflow-y-clip">
              <h2 className="text-sm font-semibold text-muted-foreground">Dentro do prazo</h2>
              <ul className="divide-y">
                <AnimatePresence initial={false}>{noPrazo.map((e) => linha(e, false))}</AnimatePresence>
              </ul>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-2 border-t pt-3">
          <Button asChild variant="ghost" className={`h-11 ${pilulaTexto}`}>
            <Link href="/biblioteca?ver=livros">Ver todos os livros</Link>
          </Button>
          {can("biblioteca:create") && (
            <Button asChild variant="ghost" className={`h-11 ${pilulaTexto}`}>
              <Link href="/biblioteca/novo">Cadastrar livro</Link>
            </Button>
          )}
        </div>

        <MobileFab label="Emprestar livro" mostrarRotulo href="/biblioteca/emprestar" />
      </div>
    </HeaderLayout>
  );
}
