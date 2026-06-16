import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";

import { resolveMembroNome } from "../_shared/membroResolver";

export const list = query({
  args: {
    busca: v.optional(v.string()),
    categoria: v.optional(v.string()),
    status: v.optional(v.string()), // DISPONIVEL, EMPRESTADO, etc (filtra por exemplares)
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "biblioteca:read");

    let livros;
    if (args.busca && args.busca.trim().length >= 2) {
      livros = await ctx.db
        .query("livros")
        .withSearchIndex("search_livros", (q) => q.search("titulo", args.busca!))
        .collect();
    } else {
      livros = await ctx.db.query("livros").collect();
    }

    if (args.categoria) {
      livros = livros.filter((l) => l.categorias.includes(args.categoria!));
    }

    return Promise.all(
      livros.map(async (l) => {
        const exemplares = await ctx.db
          .query("exemplares")
          .withIndex("by_livro", (q) => q.eq("livroId", l._id))
          .collect();

        const disponiveis = exemplares.filter((e) => e.status === "DISPONIVEL").length;
        const total = exemplares.length;

        return {
          ...l,
          totalExemplares: total,
          disponiveis,
        };
      })
    );
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
    const livros = await ctx.db.query("livros").collect();
    const cats = new Set<string>();
    for (const l of livros) {
      for (const c of l.categorias) cats.add(c);
    }
    return Array.from(cats).sort();
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
