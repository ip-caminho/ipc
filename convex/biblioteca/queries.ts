import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, type PaginationResult } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";

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
      emprestimos.map(async (e) => {
        const livro = await ctx.db.get(e.livroId);
        const membroNome = await resolveMembroNome(ctx, e.membroId);
        const exemplar = await ctx.db.get(e.exemplarId);

        const hoje = new Date().toISOString().split("T")[0];
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

export const listAtrasados = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "biblioteca:read");

    const emprestimos = await ctx.db
      .query("emprestimos")
      .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
      .collect();

    const hoje = new Date().toISOString().split("T")[0];
    const atrasados = emprestimos.filter((e) => e.dataPrevistaDevolucao < hoje);

    return Promise.all(
      atrasados.map(async (e) => {
        const livro = await ctx.db.get(e.livroId);
        const membro = await ctx.db.get(e.membroId);
        const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
        return {
          ...e,
          livroTitulo: livro?.titulo || "",
          membroNome: entidade?.nomeCompleto || "",
          membroWhatsapp: entidade?.whatsapp,
          diasAtraso: Math.floor(
            (new Date(hoje).getTime() - new Date(e.dataPrevistaDevolucao).getTime()) / 86400000
          ),
        };
      })
    );
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

/** Numero do botao da lista; o detalhe de cada atraso fica em listAtrasados. */
export const contarAtrasados = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "biblioteca:read");
    const ativos = await ctx.db
      .query("emprestimos")
      .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
      .collect();
    const hoje = new Date().toISOString().split("T")[0];
    return ativos.filter((e) => e.dataPrevistaDevolucao < hoje).length;
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
    const hoje = new Date().toISOString().split("T")[0];

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
