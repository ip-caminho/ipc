"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

export default function LivroPublicoPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const livro = useQuery(api.biblioteca.queries.getPublicByCodigo, { codigo });
  const meuEmprestimo = useQuery(
    api.biblioteca.queries.meuEmprestimoAtivoByCodigo,
    isAuthenticated ? { codigo } : "skip"
  );
  const emprestar = useMutation(api.biblioteca.mutations.emprestimoSelfService);
  const devolver = useMutation(api.biblioteca.mutations.devolverSelfService);
  const [acao, setAcao] = useState(false);

  if (livro === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (livro === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-sm">Livro nao encontrado</p>
            <Link href="/" className="text-xs underline mt-2 inline-block">Voltar ao site</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleEmprestar() {
    if (!isAuthenticated) {
      router.push(`/signin?returnUrl=/livro/${codigo}`);
      return;
    }
    setAcao(true);
    try {
      await emprestar({ codigo });
      toast.success("Emprestimo registrado!");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setAcao(false);
  }

  async function handleDevolver() {
    setAcao(true);
    try {
      await devolver({ codigo });
      toast.success("Devolvido!");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setAcao(false);
  }

  return (
    <div className="min-h-dvh bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>

        <Card>
          <CardHeader>
            <div className="flex gap-3">
              {livro.capaUrl ? (
                <img src={livro.capaUrl} alt={livro.titulo} className="w-20 h-28 object-cover rounded shrink-0" />
              ) : (
                <div className="w-20 h-28 bg-muted rounded flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base leading-tight">{livro.titulo}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{livro.autores.join(", ")}</p>
                {livro.editora && (
                  <p className="text-xs text-muted-foreground">{livro.editora}{livro.ano && ` · ${livro.ano}`}</p>
                )}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {livro.categorias.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {livro.descricao && (
              <p className="text-sm text-muted-foreground line-clamp-6">{livro.descricao}</p>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Disponibilidade</span>
              <Badge variant={livro.disponiveis > 0 ? "default" : "secondary"}>
                {livro.disponiveis} de {livro.totalExemplares}
              </Badge>
            </div>

            {/* Acoes self-service */}
            {meuEmprestimo ? (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm">
                  Voce pegou este livro emprestado. Devolucao prevista:{" "}
                  <span className="font-medium">{meuEmprestimo.dataPrevistaDevolucao}</span>
                </p>
                <Button className="w-full" onClick={handleDevolver} disabled={acao}>
                  Devolver
                </Button>
              </div>
            ) : livro.disponiveis > 0 ? (
              <Button className="w-full" onClick={handleEmprestar} disabled={acao}>
                {isAuthenticated ? "Quero pegar emprestado" : "Faça login para pegar emprestado"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center border-t pt-3">
                Todos os exemplares estão emprestados
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
