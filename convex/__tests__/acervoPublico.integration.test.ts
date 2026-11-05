import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

type T = ReturnType<typeof convexTest>;

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto: "Pessoa Sigilosa",
    });
    const membroId = await ctx.db.insert("membros", { entidadeId, role: "membro" });
    const comDois = await ctx.db.insert("livros", {
      titulo: "Zacarias",
      autores: ["Autor"],
      categorias: ["Teologia"],
      descricao: "sinopse longa",
      criadoEm: 1,
    });
    const semCategoria = await ctx.db.insert("livros", {
      titulo: "Ágape",
      autores: [],
      categorias: [],
      criadoEm: 1,
    });
    const semExemplar = await ctx.db.insert("livros", { titulo: "Sem exemplar", autores: [], categorias: [], criadoEm: 1 });
    const base = { condicao: "BOM" as const, dataAquisicao: "2025-01-01" };
    await ctx.db.insert("exemplares", {
      ...base,
      livroId: comDois,
      codigo: "BIB-0002",
      status: "EMPRESTADO",
      proprietarioNome: "Pessoa Sigilosa",
      proprietarioMembroId: membroId,
      observacoes: "observacao interna",
    });
    await ctx.db.insert("exemplares", { ...base, livroId: comDois, codigo: "BIB-0001", status: "DISPONIVEL" });
    await ctx.db.insert("exemplares", { ...base, livroId: semCategoria, codigo: "BIB-0003", status: "EMPRESTADO" });
    return { comDois, semCategoria, semExemplar };
  });
}

describe("public.acervo.catalogo", () => {
  it("responde sem login, em ordem alfabetica, com contagem e menor codigo", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    // @ts-ignore Convex TS2589
    const r = await t.query(api.public.acervo.catalogo, {});
    expect(r.map((l: { titulo: string }) => l.titulo)).toEqual(["Ágape", "Zacarias"]);
    expect(r[1]).toMatchObject({ categoria: "Teologia", codigo: "BIB-0001", totalExemplares: 2, disponiveis: 1 });
    expect(r[0]).toMatchObject({ categoria: "Outros", disponiveis: 0 });
  });

  it("nao expoe dono, observacao, sinopse nem nome de pessoa", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const r = await t.query(api.public.acervo.catalogo, {});
    const texto = JSON.stringify(r);
    expect(texto).not.toContain("Sigilosa");
    expect(texto).not.toContain("observacao interna");
    expect(texto).not.toContain("sinopse longa");
    expect(Object.keys(r[1]).sort()).toEqual(
      ["autores", "ano", "capaUrl", "categoria", "codigo", "disponiveis", "id", "titulo", "totalExemplares"].filter((k) => k in r[1]).sort(),
    );
  });
});

describe("biblioteca.importacao.aplicarCategorias", () => {
  it("grava no livro e no indice, troca a anterior e aponta livro ausente", async () => {
    const t = convexTest(schema, modules);
    const { comDois, semExemplar } = await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(semExemplar);
      await ctx.db.insert("livroCategorias", { categoria: "Teologia", livroId: comDois });
    });
    const r = await t.mutation(internal.biblioteca.importacao.aplicarCategorias, {
      itens: [
        { livroId: comDois, categoria: "Pregação" },
        { livroId: semExemplar, categoria: "Oração" },
      ],
    });
    expect(r).toEqual({ aplicados: 1, ausentes: [semExemplar] });
    const dados = await t.run(async (ctx) => ({
      livro: await ctx.db.get(comDois),
      indice: await ctx.db.query("livroCategorias").collect(),
    }));
    expect(dados.livro?.categorias).toEqual(["Pregação"]);
    expect(dados.indice.map((c) => c.categoria)).toEqual(["Pregação"]);
  });
});
