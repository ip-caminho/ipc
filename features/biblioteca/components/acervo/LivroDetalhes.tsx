"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { BookOpen } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { LivroCatalogo } from "@convex/public/acervo";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { capaPermitida } from "@features/biblioteca/lib/acervo";
import { Disponibilidade } from "./Disponibilidade";

type Props = {
  livro: LivroCatalogo | null;
  onClose: () => void;
};

export function LivroDetalhes({ livro, onClose }: Props) {
  // Só consulta enquanto a ficha está aberta; traz sinopse, editora e situação atual.
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const ficha = useQuery(api.biblioteca.queries.getPublicByCodigo, livro ? { codigo: livro.codigo } : "skip");

  const capa = capaPermitida(livro?.capaUrl);
  const disponiveis = ficha?.disponiveis ?? livro?.disponiveis ?? 0;
  const total = ficha?.totalExemplares ?? livro?.totalExemplares ?? 0;

  return (
    <ResponsiveDialog open={!!livro} onOpenChange={(aberto) => !aberto && onClose()}>
      <ResponsiveDialogContent className="light bg-background text-foreground">
        {livro && (
          <>
            <ResponsiveDialogHeader className="text-left">
              <ResponsiveDialogTitle className="font-[family-name:var(--font-display)] text-xl leading-tight">
                {livro.titulo}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {livro.autores.join(", ") || "Autor não informado"}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody className="space-y-4 pb-6">
              <div className="flex gap-4">
                {capa ? (
                  <Image
                    src={capa}
                    alt=""
                    width={112}
                    height={160}
                    className="h-40 w-28 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-28 shrink-0 items-center justify-center rounded bg-muted">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 space-y-2 text-sm">
                  <Disponibilidade disponiveis={disponiveis} total={total} />
                  <div>
                    <Badge variant="secondary">{livro.categoria}</Badge>
                  </div>
                  {ficha?.editora && <p className="text-muted-foreground">{ficha.editora}</p>}
                  {livro.ano && <p className="text-muted-foreground">{livro.ano}</p>}
                  <p className="font-mono text-xs text-muted-foreground">{livro.codigo}</p>
                </div>
              </div>
              {ficha === undefined ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : ficha?.descricao ? (
                <p className="whitespace-pre-line text-sm leading-relaxed">{ficha.descricao}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Este livro ainda não tem sinopse.</p>
              )}
            </ResponsiveDialogBody>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
