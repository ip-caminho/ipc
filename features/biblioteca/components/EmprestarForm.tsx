"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getSaoPauloDateString } from "@/convex/_shared/datetime";
import { dataPrevistaDevolucao, PRAZO_EMPRESTIMO_DIAS } from "@/convex/biblioteca/prazo";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PhoneInputBR } from "@/shared/components/ui/phone-input-br";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { StickyActionBar } from "@shared/components/layout/StickyActionBar";
import { useDebounce } from "@shared/hooks/useDebounce";
import { haptic } from "@shared/lib/haptic";
import { CapaLivro } from "@features/biblioteca/components/CapaLivro";
import { campoPilula, pilula, pilulaTexto } from "@features/biblioteca/lib/estilos";
import { formatarData } from "@features/biblioteca/lib/prancheta";
import { pessoaSemCadastroSchema } from "@features/biblioteca/lib/validations";

type LivroEscolhido = {
  titulo: string;
  autores: string[];
  capaUrl?: string;
  exemplarId: Id<"exemplares">;
};

type PessoaEscolhida = { membroId: Id<"membros">; nome: string } | { nome: string };

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${partes[0][0] ?? ""}${ultima}`.toUpperCase();
}

function IniciaisPessoa({ nome }: { nome: string }) {
  return (
    <Avatar className="h-10 w-10 shrink-0">
      <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
        {iniciais(nome)}
      </AvatarFallback>
    </Avatar>
  );
}

const opcaoClasse =
  "flex w-full items-center gap-3 border-b px-1 py-2.5 text-left active:bg-muted disabled:opacity-60";

export function EmprestarForm() {
  const router = useRouter();
  const emprestar = useMutation(api.biblioteca.mutations.emprestar);

  const [livroIdInicial, setLivroIdInicial] = useQueryState("livro", parseAsString);
  const [termoLivro, setTermoLivro] = useState("");
  const [livroBuscado, setLivroBuscado] = useState<LivroEscolhido | null>(null);
  const [termoPessoa, setTermoPessoa] = useState("");
  const [pessoa, setPessoa] = useState<PessoaEscolhida | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscaLivro = useDebounce(termoLivro, 300).trim();
  const buscaPessoa = useDebounce(termoPessoa, 300).trim();

  const opcaoInicial = useQuery(
    api.biblioteca.queries.buscarLivrosParaEmprestar,
    livroIdInicial ? { livroId: livroIdInicial as Id<"livros"> } : "skip"
  )?.[0];
  const livros = useQuery(
    api.biblioteca.queries.buscarLivrosParaEmprestar,
    buscaLivro ? { termo: buscaLivro } : "skip"
  );
  const pessoas = useQuery(
    api.biblioteca.queries.buscarPessoas,
    buscaPessoa.length >= 2 ? { termo: buscaPessoa } : "skip"
  );

  const livro: LivroEscolhido | null =
    livroBuscado ??
    (opcaoInicial?.exemplarId ? { ...opcaoInicial, exemplarId: opcaoInicial.exemplarId } : null);
  const semCadastro = pessoa !== null && !("membroId" in pessoa);
  const pronto =
    livro !== null &&
    pessoa !== null &&
    (!semCadastro || pessoaSemCadastroSchema.safeParse({ nome: pessoa.nome, whatsapp }).success);

  const prazoSemanas = PRAZO_EMPRESTIMO_DIAS / 7;
  const devolverAte = formatarData(dataPrevistaDevolucao(getSaoPauloDateString()));

  function trocarLivro() {
    setLivroBuscado(null);
    setLivroIdInicial(null);
    setTermoLivro("");
  }

  function trocarPessoa() {
    setPessoa(null);
    setWhatsapp("");
  }

  async function confirmar() {
    if (!livro || !pessoa) return;
    setSalvando(true);
    try {
      await emprestar({
        exemplarId: livro.exemplarId,
        ...("membroId" in pessoa
          ? { membroId: pessoa.membroId }
          : { pessoaNome: pessoa.nome, pessoaWhatsapp: whatsapp }),
      });
      haptic(20);
      toast.success(`${livro.titulo} emprestado`);
      router.push("/biblioteca");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao emprestar");
      setSalvando(false);
    }
  }

  return (
    <div className="container max-w-xl py-6 pb-28 md:pb-6">
      <PageHeader title="Emprestar livro" backHref="/biblioteca" />

      <div className="space-y-7 pt-2">
        <section>
          {livro ? (
            <div className="flex gap-4">
              <CapaLivro titulo={livro.titulo} capaUrl={livro.capaUrl} className="h-36 w-24" />
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <p className="font-display text-xl leading-snug">{livro.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{livro.autores.join(", ")}</p>
                <Button
                  type="button"
                  variant="ghost"
                  className={`-ml-3 mt-auto h-11 ${pilulaTexto}`}
                  onClick={trocarLivro}
                >
                  Trocar livro
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="livro" className="text-base font-semibold">Qual livro?</Label>
              <Input
                id="livro"
                type="search"
                placeholder="Título ou número da etiqueta"
                className={campoPilula}
                value={termoLivro}
                onChange={(e) => setTermoLivro(e.target.value)}
              />
              {livros?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum livro com esse nome. Tente o número da etiqueta.
                </p>
              )}
              <div>
                {livros?.map((l) => {
                  const { exemplarId } = l;
                  return (
                    <button
                      key={l.livroId}
                      type="button"
                      className={opcaoClasse}
                      disabled={!exemplarId}
                      onClick={() => exemplarId && setLivroBuscado({ ...l, exemplarId })}
                    >
                      <CapaLivro titulo={l.titulo} capaUrl={l.capaUrl} className="h-16 w-11" />
                      <span className="min-w-0">
                        <span className="font-display block truncate text-base">{l.titulo}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {exemplarId ? l.autores.join(", ") : "Nenhum exemplar na estante"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <Label htmlFor="pessoa" className="text-base font-semibold">Para quem?</Label>
          {pessoa ? (
            <>
              <div className="flex items-center gap-3">
                <IniciaisPessoa nome={pessoa.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{pessoa.nome}</p>
                  {semCadastro && <p className="text-sm text-muted-foreground">Sem cadastro</p>}
                </div>
                <Button type="button" variant="ghost" className={`h-11 shrink-0 ${pilulaTexto}`} onClick={trocarPessoa}>
                  Trocar
                </Button>
              </div>
              {semCadastro && (
                <div className="space-y-1 pt-3">
                  <Label htmlFor="whatsapp">WhatsApp, para lembrar da devolução</Label>
                  <PhoneInputBR
                    id="whatsapp"
                    className={campoPilula}
                    value={whatsapp}
                    onChange={setWhatsapp}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                id="pessoa"
                autoComplete="off"
                placeholder="Nome da pessoa"
                className={campoPilula}
                value={termoPessoa}
                onChange={(e) => setTermoPessoa(e.target.value)}
              />
              <div>
                {pessoas?.map((p) => (
                  <button key={p.membroId} type="button" className={opcaoClasse} onClick={() => setPessoa(p)}>
                    <IniciaisPessoa nome={p.nome} />
                    <span className="min-w-0 truncate font-medium">{p.nome}</span>
                  </button>
                ))}
                {pessoas && (
                  <button type="button" className={opcaoClasse} onClick={() => setPessoa({ nome: buscaPessoa })}>
                    <IniciaisPessoa nome={buscaPessoa} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{buscaPessoa}</span>
                      <span className="block text-sm text-muted-foreground">Sem cadastro, usar só o nome</span>
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <p className="border-t pt-4 text-sm text-muted-foreground">
          Volta em {prazoSemanas} semanas, até {devolverAte}.
        </p>
      </div>

      {/* Sem linha divisória: o conteúdo some em degradê atrás do botão. */}
      <StickyActionBar className="border-t-0 bg-transparent bg-linear-to-t from-background from-70% to-transparent backdrop-blur-none md:mt-6 md:bg-none">
        <Button
          className={`text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 ${pilula}`}
          disabled={!pronto || salvando}
          onClick={confirmar}
        >
          {salvando ? "Salvando..." : "Emprestar"}
        </Button>
      </StickyActionBar>
    </div>
  );
}
