"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { ArrowLeft, BookOpen, ChevronUp, Search } from "lucide-react";
import type { LivroCatalogo } from "@convex/public/acervo";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Logo } from "@shared/components/layout/Logo";
import { buscarLivros, capaPermitida, montarFileiras } from "@features/biblioteca/lib/acervo";
import type { CenaFileira } from "@features/biblioteca/lib/fileiraCena";
import { Disponibilidade } from "./Disponibilidade";
import { LivroDetalhes } from "./LivroDetalhes";

function LinhaLivro({ livro, onClick }: { livro: LivroCatalogo; onClick: () => void }) {
  const capa = capaPermitida(livro.capaUrl);
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="grid h-auto min-h-16 w-full grid-cols-[40px_minmax(0,1fr)] items-center justify-start gap-3 rounded-none border-b px-0 py-2 text-left font-normal whitespace-normal"
    >
      {capa ? (
        <Image src={capa} alt="" width={40} height={56} className="h-14 w-10 rounded-sm object-cover" />
      ) : (
        <span className="flex h-14 w-10 items-center justify-center rounded-sm bg-muted">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium">{livro.titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {livro.autores.join(", ") || "Autor não informado"}
        </span>
        <Disponibilidade disponiveis={livro.disponiveis} total={1} className="mt-0.5" />
      </span>
    </Button>
  );
}

export function AcervoPublico({ livros, abertura }: { livros: LivroCatalogo[]; abertura: number }) {
  const fileiras = useMemo(() => montarFileiras(livros), [livros]);
  const [termo, setTermo] = useQueryState("q", parseAsString.withDefault(""));
  const [listaAberta, setListaAberta] = useState(false);
  const [sem3d, setSem3d] = useState(false);
  const [atual, setAtual] = useState(abertura);
  const [expandido, setExpandido] = useState<number | null>(null);
  const palco = useRef<HTMLDivElement>(null);
  const cena = useRef<CenaFileira | null>(null);

  useEffect(() => {
    const host = palco.current;
    if (!host || !livros.length) return;
    let cancelado = false;
    // Three.js carrega só aqui, depois da busca e da lista já estarem na tela.
    import("@features/biblioteca/lib/fileiraCena")
      .then(({ criarFileira }) =>
        criarFileira(host, { livros, fileiras, abertura, aoMudar: setAtual, aoExpandir: setExpandido }),
      )
      .then((c) => {
        if (cancelado) c.destruir();
        else cena.current = c;
      })
      .catch(() => setSem3d(true));
    return () => {
      cancelado = true;
      cena.current?.destruir();
      cena.current = null;
    };
  }, [livros, fileiras, abertura]);

  const achados = useMemo(() => (termo.trim() ? buscarLivros(livros, termo) : null), [livros, termo]);
  const mostrarLista = achados !== null || listaAberta || sem3d;
  const livroAtual = livros[atual];

  function escolher(i: number) {
    void setTermo(null);
    setListaAberta(false);
    setAtual(i);
    if (cena.current) cena.current.irPara(i);
    else setExpandido(i);
  }

  if (!livros.length) {
    return (
      <main className="light flex h-dvh flex-col items-center justify-center gap-3 bg-[#f5f7fb] p-6 text-center text-foreground">
        <p className="text-sm text-muted-foreground">O acervo não está disponível agora. Tente de novo em instantes.</p>
        <Button variant="outline" asChild className="h-11">
          <Link href="/">Voltar ao site</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="light flex h-dvh flex-col overflow-hidden bg-[#f5f7fb] text-foreground">
      <header className="grid gap-2 px-4 pt-2 pb-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="-ml-2 h-11 w-11 shrink-0">
            <Link href="/" aria-label="Voltar ao site">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Logo className="mr-2 h-8 shrink-0 dark:invert-0" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none font-semibold">Biblioteca</h1>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{livros.length} livros</span>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="busca-acervo"
              type="search"
              value={termo}
              onChange={(e) => void setTermo(e.target.value || null)}
              placeholder="Título ou autor"
              aria-label="Buscar por título ou autor"
              autoComplete="off"
              className="h-11 pl-9 text-base"
            />
          </div>
          {!sem3d && (
            <Button
              variant={listaAberta ? "default" : "outline"}
              aria-pressed={listaAberta}
              onClick={() => setListaAberta((v) => !v)}
              className="h-11"
            >
              Lista
            </Button>
          )}
        </div>
      </header>

      <div ref={palco} className="relative min-h-0 flex-1 overflow-hidden">
        {mostrarLista && (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-[#f5f7fb] px-4 pb-4">
            {sem3d && !achados && (
              <p className="py-2 text-xs text-muted-foreground">
                Este aparelho não abriu o 3D. A lista mostra os mesmos livros.
              </p>
            )}
            {achados ? (
              <>
                <p className="py-2 text-xs text-muted-foreground" aria-live="polite">
                  {achados.length} {achados.length === 1 ? "livro encontrado" : "livros encontrados"}
                </p>
                {achados.map((i) => (
                  <LinhaLivro key={livros[i].id} livro={livros[i]} onClick={() => escolher(i)} />
                ))}
              </>
            ) : (
              fileiras.map((f) => (
                <section key={f.nome}>
                  <h2 className="mt-4 mb-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                    {f.nome} <span className="ml-1 text-xs font-medium text-muted-foreground tabular-nums">{f.indices.length}</span>
                  </h2>
                  {f.indices.map((i) => (
                    <LinhaLivro key={livros[i].id} livro={livros[i]} onClick={() => escolher(i)} />
                  ))}
                </section>
              ))
            )}
          </div>
        )}
      </div>

      {livroAtual && (
        <section
          aria-live="polite"
          onClick={() => setExpandido(atual)}
          className="flex min-h-28 cursor-pointer items-center gap-2 border-t bg-card py-3 pr-2 pl-4"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-lg leading-tight font-semibold text-balance">
              {livroAtual.titulo}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {livroAtual.autores.join(", ") || "Autor não informado"}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <Disponibilidade disponiveis={livroAtual.disponiveis} total={1} />
              <span>{livroAtual.categoria}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Ver informações do livro" className="h-11 w-11 shrink-0">
            <ChevronUp className="h-5 w-5" />
          </Button>
        </section>
      )}

      <LivroDetalhes livro={expandido === null ? null : livros[expandido]} onClose={() => setExpandido(null)} />
    </main>
  );
}
