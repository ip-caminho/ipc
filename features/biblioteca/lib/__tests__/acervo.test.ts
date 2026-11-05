import { describe, it, expect } from "vitest";
import type { LivroCatalogo } from "@convex/public/acervo";
import { buscarLivros, capaParaTextura, capaPermitida, montarFileiras, posicaoInicial, sortearAbertura } from "../acervo";

const CAPA = "https://cdn.yhc.com.br/biblioteca-capas/BIB-0001.jpg";

function livro(titulo: string, categoria: string, extra: Partial<LivroCatalogo> = {}): LivroCatalogo {
  return { id: titulo, titulo, autores: [], categoria, codigo: "BIB-0001", totalExemplares: 1, disponiveis: 1, ...extra };
}

describe("montarFileiras", () => {
  it("agrupa por categoria, da maior para a menor, e desempata pelo nome", () => {
    const livros = [livro("A", "Oração"), livro("B", "Teologia"), livro("C", "Teologia"), livro("D", "Missões")];
    expect(montarFileiras(livros)).toEqual([
      { nome: "Teologia", indices: [1, 2] },
      { nome: "Missões", indices: [3] },
      { nome: "Oração", indices: [0] },
    ]);
  });
});

describe("capas", () => {
  it("aceita só o CDN da igreja", () => {
    expect(capaPermitida(CAPA)).toBe(CAPA);
    expect(capaPermitida("https://books.google.com/capa.jpg")).toBeNull();
    expect(capaPermitida("nao-e-url")).toBeNull();
    expect(capaPermitida(undefined)).toBeNull();
  });

  it("serve a textura pela mesma origem", () => {
    expect(capaParaTextura(CAPA)).toBe(`/_next/image?url=${encodeURIComponent(CAPA)}&w=384&q=75`);
    expect(capaParaTextura("https://books.google.com/capa.jpg")).toBeNull();
  });
});

describe("posicaoInicial", () => {
  it("pula livros sem capa a partir da terceira posição", () => {
    const livros = [livro("A", "T"), livro("B", "T"), livro("C", "T"), livro("D", "T", { capaUrl: CAPA })];
    expect(posicaoInicial(livros, [0, 1, 2, 3])).toBe(3);
  });

  it("sem capa nenhuma, fica na terceira posição ou na última que existir", () => {
    expect(posicaoInicial([livro("A", "T"), livro("B", "T"), livro("C", "T")], [0, 1, 2])).toBe(2);
    expect(posicaoInicial([livro("A", "T")], [0])).toBe(0);
  });
});

describe("sortearAbertura", () => {
  const comCapa = { capaUrl: CAPA };

  it("sorteia na primeira fileira, entre os livros com capa e fora das pontas", () => {
    const livros = [
      livro("Ponta", "T", comCapa),
      livro("Sem capa", "T"),
      livro("B", "T", comCapa),
      livro("C", "T", comCapa),
      livro("Outra ponta", "T", comCapa),
    ];
    const fileiras = [{ nome: "T", indices: [0, 1, 2, 3, 4] }];
    expect(sortearAbertura(livros, fileiras, () => 0)).toBe(2);
    expect(sortearAbertura(livros, fileiras, () => 0.99)).toBe(3);
  });

  it("sem candidato, usa a posição inicial da fileira", () => {
    const livros = [livro("A", "T"), livro("B", "T"), livro("C", "T")];
    expect(sortearAbertura(livros, [{ nome: "T", indices: [0, 1, 2] }], () => 0)).toBe(2);
  });

  it("sem fileira, devolve zero", () => {
    expect(sortearAbertura([], [])).toBe(0);
  });
});

describe("buscarLivros", () => {
  const livros = [livro("Oração", "O", { autores: ["Irmão André"] }), livro("Teologia", "T", { autores: ["Wayne Grudem"] })];

  it("ignora acento e caixa, em título e autor", () => {
    expect(buscarLivros(livros, "ORACAO")).toEqual([0]);
    expect(buscarLivros(livros, "irmao andre")).toEqual([0]);
    expect(buscarLivros(livros, "grudem")).toEqual([1]);
    expect(buscarLivros(livros, "inexistente")).toEqual([]);
  });
});
