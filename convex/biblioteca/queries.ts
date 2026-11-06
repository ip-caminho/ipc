import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, type PaginationResult } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";
import { getSaoPauloDateString } from "../_shared/datetime";

import { resolveMembroNome } from "../_shared/membroResolver";

export const list = query({
  args: {
    busca: v.optional(v.string()),
    categoria: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { busca, categoria, paginationOpts }) => {
    await requirePermission(ctx, "biblioteca:read");

    const termo = busca?.trim() ?? "";
    let livros: Doc<"livros">[];
    let pagina: Omit<PaginationResult<unknown>, "page">;

    if (termo.length >= 2) {
      const r = await ctx.db
        .query("livros")
        .withSearchIndex("search_livros", (q) => q.search("titulo", termo))
        .paginate(paginationOpts);
      // O indice de busca nao filtra por categoria. Filtro so a pagina ja lida:
      // ela pode vir curta, e o "carregar mais" segue pelo cursor.
      livros = categoria ? r.page.filter((l) => l.categorias.includes(categoria)) : r.page;
      pagina = r;
    } else if (categoria) {
      const r = await ctx.db
        .query("livroCategorias")
        .withIndex("by_categoria", (q) => q.eq("categoria", categoria))
        .paginate(paginationOpts);
      const docs = await Promise.all(r.page.map((c) => ctx.db.get(c.livroId)));
      livros = docs.filter((l): l is Doc<"livros"> => l !== null);
      pagina = r;
    } else {
      const r = await ctx.db.query("livros").paginate(paginationOpts);
      livros = r.page;
      pagina = r;
    }

    const page = await Promise.all(
      livros.map(async (l) => {
        const exemplares = await ctx.db
          .query("exemplares")
          .withIndex("by_livro", (q) => q.eq("livroId", l._id))
          .collect();
        // So o que o card mostra: a sinopse fica no detalhe.
        return {
          _id: l._id,
          titulo: l.titulo,
          autores: l.autores,
          capaUrl: l.capaUrl,
          categorias: l.categorias,
          totalExemplares: exemplares.length,
          disponiveis: exemplares.filter((e) => e.status === "DISPONIVEL").length,
        };
      })
    );

    // splitCursor e pageStatus seguem junto: usePaginatedQuery divide paginas grandes com eles.
    return { ...pagina, page };
  },
});

export const getById = query({
  args: { id: v.id("livros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "biblioteca:read");

    const livro = await ctx.db.get(id);
    if (!livro) return null;

    const exemplares = await ctx.db
      .query("exemplares")
      .withIndex("by_livro", (q) => q.eq("livroId", id))
      .collect();

    return {
      ...livro,
      exemplares,
      disponiveis: exemplares.filter((e) => e.status === "DISPONIVEL").length,
    };
  },
});

export const listExemplares = query({
  args: { livroId: v.id("livros") },
  handler: async (ctx, { livroId }) => {
    await requirePermission(ctx, "biblioteca:read");
    return await ctx.db
      .query("exemplares")
      .withIndex("by_livro", (q) => q.eq("livroId", livroId))
      .collect();
  },
});

export const listEmprestimos = query({
  args: {
    livroId: v.optional(v.id("livros")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "biblioteca:read");

    let emprestimos;
    if (args.livroId) {
      emprestimos = await ctx.db
        .query("emprestimos")
        .withIndex("by_livro", (q) => q.eq("livroId", args.livroId!))
        .collect();
    } else {
      emprestimos = await ctx.db.query("emprestimos").collect();
    }

    if (args.status) {
      emprestimos = emprestimos.filter((e) => e.status === args.status);
    }

    return Promise.all(
      emprestimos.map(async ({ pessoaWhatsapp: _telefone, ...e }) => {
        const livro = await ctx.db.get(e.livroId);
        const membroNome = e.pessoaNome ?? (await resolveMembroNome(ctx, e.membroId));
        const exemplar = await ctx.db.get(e.exemplarId);

        const hoje = getSaoPauloDateString();
        const atrasado = e.status === "ATIVO" && e.dataPrevistaDevolucao < hoje;

        return {
          ...e,
          livroTitulo: livro?.titulo || "",
          membroNome,
          exemplarCodigo: exemplar?.codigo || "",
          atrasado,
        };
      })
    );
  },
});

/** A prancheta: o que esta fora da estante, do emprestimo mais antigo ao mais novo. */
export const listAtivos = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "biblioteca:emprestar");

    const ativos = await ctx.db
      .query("emprestimos")
      .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
      .collect();

    const linhas = await Promise.all(
      ativos.map(async (e) => {
        const livro = await ctx.db.get(e.livroId);
        const membro = e.membroId ? await ctx.db.get(e.membroId) : null;
        const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
        return {
          _id: e._id,
          livroId: e.livroId,
          livroTitulo: livro?.titulo ?? "",
          pessoa: e.pessoaNome ?? entidade?.nomeCompleto ?? "",
          whatsapp: e.pessoaWhatsapp ?? entidade?.whatsapp,
          dataEmprestimo: e.dataEmprestimo,
          dataPrevistaDevolucao: e.dataPrevistaDevolucao,
        };
      })
    );
    return linhas.sort((a, b) => a.dataEmprestimo.localeCompare(b.dataEmprestimo));
  },
});

const LIVROS_NA_BUSCA = 6;
const PESSOAS_NA_BUSCA = 5;

// A busca do Convex nao ignora acento nem acha no meio do texto. Quando ela nao
// acha nada, confere o texto inteiro: raro e so no formulario de emprestimo.
const TETO_LIVROS_CONFERIDOS = 2000;
const TETO_PESSOAS_CONFERIDAS = 2000;
const MINIMO_PARA_CONFERIR = 3;

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function exemplarNaEstante(exemplares: Doc<"exemplares">[], preferido?: Id<"exemplares">) {
  const naEstante = exemplares.filter((e) => e.status === "DISPONIVEL");
  return naEstante.find((e) => e._id === preferido) ?? naEstante[0] ?? null;
}

/** Formulario de emprestimo: por codigo da etiqueta, titulo ou livro ja escolhido. */
export const buscarLivrosParaEmprestar = query({
  args: { termo: v.optional(v.string()), livroId: v.optional(v.id("livros")) },
  handler: async (ctx, { termo, livroId }) => {
    await requirePermission(ctx, "biblioteca:emprestar");

    const texto = termo?.trim() ?? "";
    const numeroEtiqueta = texto.match(/^(?:bib[-\s]?)?(\d{1,4})$/i)?.[1];
    let livros: Doc<"livros">[] = [];
    let exemplarDaEtiqueta: Doc<"exemplares"> | null = null;

    if (livroId) {
      const livro = await ctx.db.get(livroId);
      if (livro) livros = [livro];
    } else if (numeroEtiqueta) {
      exemplarDaEtiqueta = await ctx.db
        .query("exemplares")
        .withIndex("by_codigo", (q) => q.eq("codigo", `BIB-${numeroEtiqueta.padStart(4, "0")}`))
        .first();
      const livro = exemplarDaEtiqueta ? await ctx.db.get(exemplarDaEtiqueta.livroId) : null;
      if (livro) livros = [livro];
    }
    if (livros.length === 0 && !livroId && texto.length >= 2) {
      livros = await ctx.db
        .query("livros")
        .withSearchIndex("search_livros", (q) => q.search("titulo", texto))
        .take(LIVROS_NA_BUSCA);

      if (livros.length === 0 && texto.length >= MINIMO_PARA_CONFERIR) {
        const procurado = semAcento(texto);
        const todos = await ctx.db.query("livros").take(TETO_LIVROS_CONFERIDOS);
        livros = todos
          .filter((l) => semAcento(`${l.titulo} ${l.autores.join(" ")}`).includes(procurado))
          .slice(0, LIVROS_NA_BUSCA);
      }
    }

    return Promise.all(
      livros.map(async (l) => {
        const exemplares = await ctx.db
          .query("exemplares")
          .withIndex("by_livro", (q) => q.eq("livroId", l._id))
          .collect();
        const exemplar = exemplarNaEstante(exemplares, exemplarDaEtiqueta?._id);
        return {
          livroId: l._id,
          titulo: l.titulo,
          autores: l.autores,
          exemplarId: exemplar?._id ?? null,
          codigo: exemplar?.codigo ?? null,
        };
      })
    );
  },
});

/** Membros ativos pelo nome, sem carregar a lista inteira no celular. */
export const buscarPessoas = query({
  args: { termo: v.string() },
  handler: async (ctx, { termo }) => {
    await requirePermission(ctx, "biblioteca:emprestar");

    const texto = termo.trim();
    if (texto.length < 2) return [];

    const achadas = await ctx.db
      .query("entidades")
      .withSearchIndex("search_entidades", (q) =>
        q.search("nomeCompleto", texto).eq("status", "ATIVO")
      )
      .take(PESSOAS_NA_BUSCA * 2);

    let entidades = achadas;
    if (achadas.length === 0 && texto.length >= MINIMO_PARA_CONFERIR) {
      const procurado = semAcento(texto);
      const ativas = await ctx.db
        .query("entidades")
        .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
        .take(TETO_PESSOAS_CONFERIDAS);
      entidades = ativas.filter((e) => semAcento(e.nomeCompleto ?? "").includes(procurado));
    }

    const pessoas: { membroId: Id<"membros">; nome: string }[] = [];
    for (const entidade of entidades) {
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
        .first();
      if (membro) pessoas.push({ membroId: membro._id, nome: entidade.nomeCompleto ?? "" });
      if (pessoas.length === PESSOAS_NA_BUSCA) break;
    }
    return pessoas;
  },
});

export const listCategorias = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "biblioteca:read");
    // Salta de categoria em categoria pelo indice: 1 leitura por categoria em uso.
    const categorias: string[] = [];
    let atual = await ctx.db.query("livroCategorias").withIndex("by_categoria").first();
    while (atual) {
      const categoria: string = atual.categoria;
      categorias.push(categoria);
      atual = await ctx.db
        .query("livroCategorias")
        .withIndex("by_categoria", (q) => q.gt("categoria", categoria))
        .first();
    }
    return categorias;
  },
});

export const listEventos = query({
  args: { exemplarId: v.id("exemplares") },
  handler: async (ctx, { exemplarId }) => {
    await requirePermission(ctx, "biblioteca:read");

    return await ctx.db
      .query("livroEventos")
      .withIndex("by_exemplar", (q) => q.eq("exemplarId", exemplarId))
      .collect();
  },
});

// Verificar se o membro logado tem emprestimo ativo deste livro
export const meuEmprestimoAtivoByCodigo = query({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    const exemplar = await ctx.db
      .query("exemplares")
      .withIndex("by_codigo", (q) => q.eq("codigo", codigo))
      .first();
    if (!exemplar) return null;

    // Buscar emprestimos ativos do mesmo livro do membro logado
    const emprestimos = await ctx.db
      .query("emprestimos")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    return (
      emprestimos.find(
        (e) => e.status === "ATIVO" && e.livroId === exemplar.livroId
      ) ?? null
    );
  },
});

// Lista emprestimos ativos do membro logado
export const meusEmprestimos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const emprestimos = await ctx.db
      .query("emprestimos")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    const ativos = emprestimos.filter((e) => e.status === "ATIVO");
    const hoje = getSaoPauloDateString();

    return Promise.all(
      ativos.map(async (e) => {
        const livro = await ctx.db.get(e.livroId);
        const exemplar = await ctx.db.get(e.exemplarId);
        return {
          ...e,
          livroTitulo: livro?.titulo || "",
          livroCapaUrl: livro?.capaUrl,
          exemplarCodigo: exemplar?.codigo || "",
          atrasado: e.dataPrevistaDevolucao < hoje,
        };
      })
    );
  },
});

// Query publica (sem auth) — ficha do livro via QR code
export const getPublicByCodigo = query({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const exemplar = await ctx.db
      .query("exemplares")
      .withIndex("by_codigo", (q) => q.eq("codigo", codigo))
      .first();
    if (!exemplar) return null;

    const livro = await ctx.db.get(exemplar.livroId);
    if (!livro) return null;

    // Contar exemplares disponiveis do mesmo livro
    const exemplares = await ctx.db
      .query("exemplares")
      .withIndex("by_livro", (q) => q.eq("livroId", livro._id))
      .collect();
    const disponiveis = exemplares.filter((e) => e.status === "DISPONIVEL").length;

    return {
      livroId: livro._id,
      titulo: livro.titulo,
      autores: livro.autores,
      editora: livro.editora,
      ano: livro.ano,
      categorias: livro.categorias,
      capaUrl: livro.capaUrl,
      descricao: livro.descricao,
      disponiveis,
      totalExemplares: exemplares.length,
      exemplarStatus: exemplar.status,
    };
  },
});
