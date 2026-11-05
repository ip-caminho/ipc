import type { LivroCatalogo } from "@convex/public/acervo";

export type Fileira = { nome: string; indices: number[] };

/** Uma fileira por categoria, da maior para a menor; em empate, ordem alfabética. */
export function montarFileiras(livros: LivroCatalogo[]): Fileira[] {
  const porCategoria = new Map<string, number[]>();
  livros.forEach((l, i) => {
    const lista = porCategoria.get(l.categoria);
    if (lista) lista.push(i);
    else porCategoria.set(l.categoria, [i]);
  });
  return [...porCategoria.entries()]
    .map(([nome, indices]) => ({ nome, indices }))
    .sort((a, b) => b.indices.length - a.indices.length || a.nome.localeCompare(b.nome, "pt-BR"));
}

const HOST_CAPAS = "cdn.yhc.com.br";

/** Capa que o next/image pode servir. Outro host fica sem imagem. */
export function capaPermitida(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname === HOST_CAPAS ? url : null;
  } catch {
    return null;
  }
}

/**
 * URL da capa para textura 3D. O CDN não libera CORS, e o WebGL recusa imagem de
 * outra origem; o otimizador do Next serve na mesma origem e reduz as capas grandes.
 */
export function capaParaTextura(url?: string): string | null {
  const permitida = capaPermitida(url);
  return permitida ? `/_next/image?url=${encodeURIComponent(permitida)}&w=384&q=75` : null;
}

/** Posição inicial de uma fileira: o primeiro livro com capa, com vizinhos dos dois lados. */
export function posicaoInicial(livros: LivroCatalogo[], indices: number[]): number {
  const inicio = Math.min(2, indices.length - 1);
  for (let n = inicio; n < indices.length; n++) {
    if (capaPermitida(livros[indices[n]].capaUrl)) return n;
  }
  return inicio;
}

/**
 * Livro de abertura: sorteado na primeira fileira, entre os que têm capa e vizinhos
 * dos dois lados. Sem candidato, usa a posição inicial da fileira.
 */
export function sortearAbertura(
  livros: LivroCatalogo[],
  fileiras: Fileira[],
  sorteio: () => number = Math.random,
): number {
  const indices = fileiras[0]?.indices;
  if (!indices) return 0;
  const candidatos = indices.slice(1, -1).filter((i) => capaPermitida(livros[i].capaUrl));
  if (!candidatos.length) return indices[posicaoInicial(livros, indices)];
  return candidatos[Math.floor(sorteio() * candidatos.length)];
}

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Índices dos livros cujo título ou autor contém o termo, ignorando acento e caixa. */
export function buscarLivros(livros: LivroCatalogo[], termo: string): number[] {
  const t = semAcento(termo.trim());
  const achados: number[] = [];
  livros.forEach((l, i) => {
    if (semAcento(`${l.titulo} ${l.autores.join(" ")}`).includes(t)) achados.push(i);
  });
  return achados;
}
