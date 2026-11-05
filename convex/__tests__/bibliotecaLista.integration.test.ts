import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUserComMembro, seedUser, as } from "./helpers";

type T = ReturnType<typeof convexTest>;

async function leitor(t: T) {
  return as(t, await seedUser(t, { role: "membro", permissions: ["biblioteca:read"] }));
}

async function gestor(t: T) {
  return as(
    t,
    await seedUser(t, {
      role: "membro",
      permissions: ["biblioteca:read", "biblioteca:create", "biblioteca:update"],
    })
  );
}

async function criarLivro(t: T, titulo: string, categorias: string[] = []) {
  const g = await gestor(t);
  // @ts-ignore Convex TS2589
  return await g.mutation(api.biblioteca.mutations.create, {
    titulo,
    autores: ["Autor"],
    categorias,
    condicao: "BOM",
  });
}

const pagina = (numItems: number, cursor: string | null = null) => ({ numItems, cursor });

describe("biblioteca.queries.list", () => {
  it("pagina, conta exemplares e nao devolve a sinopse", async () => {
    const t = convexTest(schema, modules);
    for (const titulo of ["Livro A", "Livro B", "Livro C"]) await criarLivro(t, titulo);
    await t.run(async (ctx) => {
      const l = await ctx.db.query("livros").first();
      await ctx.db.patch(l!._id, { descricao: "sinopse longa" });
    });
    const u = await leitor(t);

    const p1 = await u.query(api.biblioteca.queries.list, { paginationOpts: pagina(2) });
    expect(p1.page).toHaveLength(2);
    expect(p1.isDone).toBe(false);
    expect(p1.page[0]).toMatchObject({ totalExemplares: 1, disponiveis: 1 });
    expect(p1.page[0]).not.toHaveProperty("descricao");

    const p2 = await u.query(api.biblioteca.queries.list, {
      paginationOpts: pagina(2, p1.continueCursor),
    });
    expect(p2.page).toHaveLength(1);
    expect(p2.isDone).toBe(true);
  });

  it("filtra por categoria e por busca, inclusive combinados", async () => {
    const t = convexTest(schema, modules);
    await criarLivro(t, "Teologia do Antigo Testamento", ["Teologia"]);
    await criarLivro(t, "Teologia para criancas", ["Infantil"]);
    await criarLivro(t, "Romance qualquer");
    const u = await leitor(t);
    const titulos = (r: { page: { titulo: string }[] }) => r.page.map((l) => l.titulo).sort();

    expect(
      titulos(await u.query(api.biblioteca.queries.list, { categoria: "Teologia", paginationOpts: pagina(10) }))
    ).toEqual(["Teologia do Antigo Testamento"]);
    expect(
      titulos(await u.query(api.biblioteca.queries.list, { busca: "Teologia", paginationOpts: pagina(10) }))
    ).toEqual(["Teologia do Antigo Testamento", "Teologia para criancas"]);
    expect(
      titulos(
        await u.query(api.biblioteca.queries.list, {
          busca: "Teologia",
          categoria: "Infantil",
          paginationOpts: pagina(10),
        })
      )
    ).toEqual(["Teologia para criancas"]);
  });

  it("exige permissao de leitura", async () => {
    const t = convexTest(schema, modules);
    const u = as(t, await seedUser(t, { role: "membro", permissions: [] }));
    await expect(
      u.query(api.biblioteca.queries.list, { paginationOpts: pagina(2) })
    ).rejects.toThrow();
  });
});

describe("categorias da biblioteca", () => {
  it("listCategorias traz as categorias em uso e acompanha create e update", async () => {
    const t = convexTest(schema, modules);
    const livroId = await criarLivro(t, "Livro A", ["Teologia", "Familia"]);
    await criarLivro(t, "Livro B", ["Teologia"]);
    const u = await leitor(t);
    expect(await u.query(api.biblioteca.queries.listCategorias, {})).toEqual(["Familia", "Teologia"]);

    const g = await gestor(t);
    await g.mutation(api.biblioteca.mutations.update, { id: livroId, categorias: ["Missoes"] });
    expect(await u.query(api.biblioteca.queries.listCategorias, {})).toEqual(["Missoes", "Teologia"]);
    const r = await u.query(api.biblioteca.queries.list, { categoria: "Familia", paginationOpts: pagina(10) });
    expect(r.page).toHaveLength(0);
  });

  it("update sem categorias nao mexe nas categorias", async () => {
    const t = convexTest(schema, modules);
    const livroId = await criarLivro(t, "Livro A", ["Teologia"]);
    const g = await gestor(t);
    await g.mutation(api.biblioteca.mutations.update, { id: livroId, titulo: "Livro A2" });
    const u = await leitor(t);
    expect(await u.query(api.biblioteca.queries.listCategorias, {})).toEqual(["Teologia"]);
  });

  it("createBatch registra as categorias", async () => {
    const t = convexTest(schema, modules);
    const g = await gestor(t);
    await g.mutation(api.biblioteca.mutations.createBatch, {
      livros: [{ titulo: "Lote", autores: [], categorias: ["Devocional"], condicao: "BOM" }],
    });
    const u = await leitor(t);
    expect(await u.query(api.biblioteca.queries.listCategorias, {})).toEqual(["Devocional"]);
  });
});

describe("biblioteca.queries.contarAtrasados", () => {
  it("conta so emprestimo ativo com prazo vencido", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedUserComMembro(t, { role: "membro" });
    const livroId = await criarLivro(t, "Livro A");
    await t.run(async (ctx) => {
      const exemplarId = (await ctx.db.query("exemplares").first())!._id;
      const base = { exemplarId, livroId, membroId, dataEmprestimo: "2020-01-01" };
      await ctx.db.insert("emprestimos", { ...base, dataPrevistaDevolucao: "2020-01-15", status: "ATIVO" });
      await ctx.db.insert("emprestimos", { ...base, dataPrevistaDevolucao: "2999-01-15", status: "ATIVO" });
      await ctx.db.insert("emprestimos", { ...base, dataPrevistaDevolucao: "2020-01-15", status: "DEVOLVIDO" });
    });
    const u = await leitor(t);
    expect(await u.query(api.biblioteca.queries.contarAtrasados, {})).toBe(1);
  });
});
