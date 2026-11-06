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
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PhoneInputBR } from "@/shared/components/ui/phone-input-br";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { StickyActionBar } from "@shared/components/layout/StickyActionBar";
import { useDebounce } from "@shared/hooks/useDebounce";
import { formatarData } from "@features/biblioteca/lib/prancheta";
import { pessoaSemCadastroSchema } from "@features/biblioteca/lib/validations";

type LivroEscolhido = {
  titulo: string;
  autores: string[];
  exemplarId: Id<"exemplares">;
};

type PessoaEscolhida = { membroId: Id<"membros">; nome: string } | { nome: string };

const opcaoClasse =
  "block w-full rounded-lg border bg-card px-3 py-2 text-left active:opacity-70 disabled:opacity-60";

function Escolhido({
  titulo,
  detalhe,
  onTrocar,
}: {
  titulo: string;
  detalhe?: string;
  onTrocar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-primary bg-primary/5 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium">{titulo}</p>
        {detalhe && <p className="truncate text-sm text-muted-foreground">{detalhe}</p>}
      </div>
      <Button type="button" variant="ghost" className="h-11 shrink-0 text-primary" onClick={onTrocar}>
        Trocar
      </Button>
    </div>
  );
}

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
      toast.success(`${livro.titulo} emprestado`);
      router.push("/biblioteca");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao emprestar");
      setSalvando(false);
    }
  }

  return (
    <div className="container max-w-xl pb-28 md:pb-6">
      <DetailHeader title="Emprestar livro" backHref="/biblioteca" />

      <div className="space-y-6 pt-2">
        <section className="space-y-2">
          <Label htmlFor="livro" className="text-base font-semibold">Qual livro?</Label>
          {livro ? (
            <Escolhido titulo={livro.titulo} detalhe={livro.autores.join(", ")} onTrocar={trocarLivro} />
          ) : (
            <>
              <Input
                id="livro"
                type="search"
                placeholder="Título ou código da etiqueta"
                className="h-12 text-base"
                value={termoLivro}
                onChange={(e) => setTermoLivro(e.target.value)}
              />
              {livros?.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum livro encontrado</p>
              )}
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
                    <span className="block truncate font-medium">{l.titulo}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {exemplarId ? l.autores.join(", ") : "Nenhum exemplar na estante"}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </section>

        <section className="space-y-2">
          <Label htmlFor="pessoa" className="text-base font-semibold">Para quem?</Label>
          {pessoa ? (
            <>
              <Escolhido
                titulo={pessoa.nome}
                detalhe={semCadastro ? "Sem cadastro" : undefined}
                onTrocar={trocarPessoa}
              />
              {semCadastro && (
                <div className="space-y-1 pt-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <PhoneInputBR
                    id="whatsapp"
                    className="h-12 text-base"
                    value={whatsapp}
                    onChange={setWhatsapp}
                  />
                  <p className="text-sm text-muted-foreground">Para lembrar da devolução.</p>
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                id="pessoa"
                autoComplete="off"
                placeholder="Nome da pessoa"
                className="h-12 text-base"
                value={termoPessoa}
                onChange={(e) => setTermoPessoa(e.target.value)}
              />
              {pessoas?.map((p) => (
                <button
                  key={p.membroId}
                  type="button"
                  className={`${opcaoClasse} min-h-12 font-medium`}
                  onClick={() => setPessoa(p)}
                >
                  {p.nome}
                </button>
              ))}
              {pessoas && (
                <button
                  type="button"
                  className={`${opcaoClasse} min-h-12`}
                  onClick={() => setPessoa({ nome: buscaPessoa })}
                >
                  Usar só o nome &quot;{buscaPessoa}&quot; (sem cadastro)
                </button>
              )}
            </>
          )}
        </section>

        <p className="text-sm text-muted-foreground">
          Prazo de {prazoSemanas} semanas: devolver até {devolverAte}.
        </p>
      </div>

      <StickyActionBar className="md:mt-6">
        <Button disabled={!pronto || salvando} onClick={confirmar}>
          {salvando ? "Salvando..." : "Emprestar"}
        </Button>
      </StickyActionBar>
    </div>
  );
}
