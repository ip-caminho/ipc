import { query } from "../_generated/server";

// Consulta pública do acervo (sem auth). Só o que a fileira mostra: NÃO inclui
// dono do exemplar, doador, observações nem quem está com o livro. A sinopse fica
// em getPublicByCodigo, carregada ao abrir um livro.

export type LivroCatalogo = {
  id: string;
  titulo: string;
  autores: string[];
  ano?: number;
  capaUrl?: string;
  categoria: string;
  codigo: string;
  totalExemplares: number;
  disponiveis: number;
};

// O catálogo é o acervo inteiro por definição: lê as duas tabelas, com teto, e só
// deve ser chamado de dentro do cache da rota (features/biblioteca/lib/acervoData.ts).
const TETO_LIVROS = 2000;
const TETO_EXEMPLARES = 4000;
const SEM_CATEGORIA = "Outros";

export const catalogo = query({
  args: {},
  handler: async (ctx): Promise<LivroCatalogo[]> => {
    const [livros, exemplares] = await Promise.all([
      ctx.db.query("livros").take(TETO_LIVROS),
      ctx.db.query("exemplares").take(TETO_EXEMPLARES),
    ]);

    const porLivro = new Map<string, { codigo: string; total: number; disponiveis: number }>();
    for (const e of exemplares) {
      const atual = porLivro.get(e.livroId) ?? { codigo: e.codigo, total: 0, disponiveis: 0 };
      atual.total += 1;
      if (e.status === "DISPONIVEL") atual.disponiveis += 1;
      if (e.codigo < atual.codigo) atual.codigo = e.codigo;
      porLivro.set(e.livroId, atual);
    }

    const itens: LivroCatalogo[] = [];
    for (const l of livros) {
      const ex = porLivro.get(l._id);
      if (!ex) continue;
      itens.push({
        id: l._id,
        titulo: l.titulo,
        autores: l.autores,
        ano: l.ano,
        capaUrl: l.capaUrl,
        categoria: l.categorias[0] ?? SEM_CATEGORIA,
        codigo: ex.codigo,
        totalExemplares: ex.total,
        disponiveis: ex.disponiveis,
      });
    }
    return itens.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  },
});
