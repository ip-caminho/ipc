import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

type T = ReturnType<typeof convexTest>;

async function seedMembro(t: T, nomeCompleto: string) {
  return await t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto,
    });
    return await ctx.db.insert("membros", { entidadeId, role: "membro" });
  });
}

const livroBase = {
  titulo: "Cristianismo puro e simples",
  autores: ["C.S. Lewis"],
  categorias: [],
};

describe("biblioteca.importacao.importarLote", () => {
  it("cria livro com varios exemplares, proprietario e emprestimo ativo", async () => {
    const t = convexTest(schema, modules);
    const dono = await seedMembro(t, "Fulano de Tal");
    const leitor = await seedMembro(t, "Ciclano Souza");

    // @ts-ignore Convex TS2589
    const r = await t.mutation(internal.biblioteca.importacao.importarLote, {
      livros: [
        {
          ...livroBase,
          exemplares: [
            { codigo: "BIB-0010", numeroNotion: 10, dataAquisicao: "2025-07-01" },
            {
              codigo: "BIB-0011",
              numeroNotion: 11,
              dataAquisicao: "2025-07-02",
              proprietarioNome: "Fulano",
              proprietarioMembroId: dono,
              emprestimo: { membroId: leitor, dataEmprestimo: "2025-12-07" },
            },
          ],
        },
      ],
    });
    expect(r).toMatchObject({ livrosCriados: 1, exemplaresCriados: 2, emprestimosCriados: 1 });

    const dados = await t.run(async (ctx) => ({
      livros: await ctx.db.query("livros").collect(),
      exemplares: await ctx.db.query("exemplares").collect(),
      emprestimos: await ctx.db.query("emprestimos").collect(),
      eventos: await ctx.db.query("livroEventos").collect(),
    }));
    expect(dados.livros).toHaveLength(1);
    const emprestado = dados.exemplares.find((e) => e.codigo === "BIB-0011")!;
    expect(emprestado.status).toBe("EMPRESTADO");
    expect(emprestado.proprietarioMembroId).toBe(dono);
    expect(dados.exemplares.find((e) => e.codigo === "BIB-0010")!.status).toBe("DISPONIVEL");
    expect(dados.emprestimos[0]).toMatchObject({
      membroId: leitor,
      status: "ATIVO",
      dataPrevistaDevolucao: "2025-12-21",
    });
    expect(dados.eventos.map((e) => e.tipo).sort()).toEqual(["CADASTRO", "CADASTRO", "EMPRESTIMO"]);
  });

  it("e idempotente: rodar de novo pula codigos existentes e anexa novos ao mesmo livro", async () => {
    const t = convexTest(schema, modules);
    const lote = {
      livros: [{ ...livroBase, exemplares: [{ codigo: "BIB-0001", dataAquisicao: "2025-07-01" }] }],
    };
    await t.mutation(internal.biblioteca.importacao.importarLote, lote);
    const r2 = await t.mutation(internal.biblioteca.importacao.importarLote, lote);
    expect(r2).toMatchObject({ livrosCriados: 0, exemplaresCriados: 0, pulados: ["BIB-0001"] });

    const r3 = await t.mutation(internal.biblioteca.importacao.importarLote, {
      livros: [
        {
          ...livroBase,
          exemplares: [
            { codigo: "BIB-0001", dataAquisicao: "2025-07-01" },
            { codigo: "BIB-0338", dataAquisicao: "2025-07-01" },
          ],
        },
      ],
    });
    expect(r3).toMatchObject({ livrosCriados: 0, exemplaresCriados: 1 });
    const livros = await t.run(async (ctx) => await ctx.db.query("livros").collect());
    expect(livros).toHaveLength(1);
  });
});

describe("biblioteca.importacao.resolverMembros", () => {
  it("casa nome sem acento; nome exato desempata; ambiguo e ausente nao vinculam", async () => {
    const t = convexTest(schema, modules);
    const andre = await seedMembro(t, "André Kim Choi");
    const paulo = await seedMembro(t, "Paulo Choi");
    await seedMembro(t, "Paulo Choi Lee");
    await seedMembro(t, "Maria Lee");

    const r = await t.query(internal.biblioteca.importacao.resolverMembros, {
      nomes: ["Andre Choi", "Paulo Choi", "Lee", "Ninguem Aqui"],
    });
    expect(r["Andre Choi"]).toMatchObject({ status: "OK", membroId: andre });
    // "Paulo Choi Lee" tambem tem as palavras, mas o nome exato desempata
    expect(r["Paulo Choi"]).toMatchObject({ status: "OK", membroId: paulo });
    expect(r["Lee"].status).toBe("AMBIGUO");
    expect(r["Ninguem Aqui"].status).toBe("NAO_ENCONTRADO");
  });
});

describe("biblioteca.importacao.importarAcervo", () => {
  it("dryRun nao grava e reporta codigos existentes e nomes", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t, "Fulano de Tal");
    await t.mutation(internal.biblioteca.importacao.importarLote, {
      livros: [{ ...livroBase, exemplares: [{ codigo: "BIB-0001", dataAquisicao: "2025-07-01" }] }],
    });

    const r = await t.action(internal.biblioteca.importacao.importarAcervo, {
      dryRun: true,
      livros: [
        { ...livroBase, exemplares: [{ codigo: "BIB-0001", dataAquisicao: "2025-07-01" }] },
        {
          titulo: "Outro",
          autores: [],
          categorias: [],
          exemplares: [
            {
              codigo: "BIB-0002",
              dataAquisicao: "2025-07-01",
              proprietarioNome: "Fulano",
              emPosse: { nome: "Beltrano", dataEmprestimo: "2025-12-01" },
            },
          ],
        },
      ],
    });
    expect(r).toMatchObject({ dryRun: true, livrosAImportar: 1, codigosJaExistentes: ["BIB-0001"] });
    expect(r.membros["Fulano"].status).toBe("OK");
    expect(r.membros["Beltrano"].status).toBe("NAO_ENCONTRADO");
    const exemplares = await t.run(async (ctx) => await ctx.db.query("exemplares").collect());
    expect(exemplares).toHaveLength(1);
  });

  it("sem dryRun: em posse de quem nao e membro vira observacao, nao emprestimo", async () => {
    const t = convexTest(schema, modules);
    const r = await t.action(internal.biblioteca.importacao.importarAcervo, {
      dryRun: false,
      livros: [
        {
          ...livroBase,
          exemplares: [
            {
              codigo: "BIB-0005",
              dataAquisicao: "2025-07-01",
              emPosse: { nome: "Beltrano", dataEmprestimo: "2025-12-01" },
            },
          ],
        },
      ],
    });
    expect(r).toMatchObject({ exemplaresCriados: 1, emprestimosCriados: 0 });
    const ex = await t.run(async (ctx) => await ctx.db.query("exemplares").first());
    expect(ex?.status).toBe("DISPONIVEL");
    expect(ex?.observacoes).toContain("Beltrano");
  });
});

describe("biblioteca.importacao.removerLivroDeTeste", () => {
  async function seedLivroComHistorico(t: T, status: "ATIVO" | "DEVOLVIDO") {
    const membroId = await seedMembro(t, "Fulano de Tal");
    return await t.run(async (ctx) => {
      const livroId = await ctx.db.insert("livros", {
        titulo: "Livro de teste",
        autores: [],
        categorias: [],
        criadoEm: 1,
      });
      const exemplarId = await ctx.db.insert("exemplares", {
        livroId,
        codigo: "BIB-0001",
        condicao: "BOM",
        status: "DISPONIVEL",
        dataAquisicao: "2026-04-10",
      });
      await ctx.db.insert("emprestimos", {
        exemplarId,
        livroId,
        membroId,
        dataEmprestimo: "2026-04-10",
        dataPrevistaDevolucao: "2026-04-24",
        status,
      });
      await ctx.db.insert("livroEventos", {
        exemplarId,
        livroId,
        tipo: "CADASTRO",
        data: "2026-04-10",
        descricao: "Cadastro",
      });
      return livroId;
    });
  }

  it("remove o livro e tudo que aponta para ele, sem tocar em outros livros", async () => {
    const t = convexTest(schema, modules);
    const livroId = await seedLivroComHistorico(t, "DEVOLVIDO");
    await t.run(async (ctx) => {
      await ctx.db.insert("livroCategorias", { categoria: "Teste", livroId });
    });
    await t.mutation(internal.biblioteca.importacao.importarLote, {
      livros: [
        {
          ...livroBase,
          categorias: ["Apologetica"],
          exemplares: [{ codigo: "BIB-0002", dataAquisicao: "2025-07-01" }],
        },
      ],
    });

    const r = await t.mutation(internal.biblioteca.importacao.removerLivroDeTeste, {
      livroId,
      tituloEsperado: "Livro de teste",
    });
    expect(r).toEqual({ codigos: ["BIB-0001"], emprestimos: 1, eventos: 1 });

    const dados = await t.run(async (ctx) => ({
      livros: await ctx.db.query("livros").collect(),
      exemplares: await ctx.db.query("exemplares").collect(),
      emprestimos: await ctx.db.query("emprestimos").collect(),
      eventos: await ctx.db.query("livroEventos").collect(),
      categorias: await ctx.db.query("livroCategorias").collect(),
    }));
    expect(dados.categorias.map((c) => c.categoria)).toEqual(["Apologetica"]);
    expect(dados.livros.map((l) => l.titulo)).toEqual([livroBase.titulo]);
    expect(dados.exemplares.map((e) => e.codigo)).toEqual(["BIB-0002"]);
    expect(dados.emprestimos).toHaveLength(0);
    expect(dados.eventos).toHaveLength(1);
  });

  it("recusa titulo diferente e livro com emprestimo ativo", async () => {
    const t = convexTest(schema, modules);
    const ativo = await seedLivroComHistorico(t, "ATIVO");
    await expect(
      t.mutation(internal.biblioteca.importacao.removerLivroDeTeste, {
        livroId: ativo,
        tituloEsperado: "Outro titulo",
      })
    ).rejects.toThrow(/Titulo nao confere/);
    await expect(
      t.mutation(internal.biblioteca.importacao.removerLivroDeTeste, {
        livroId: ativo,
        tituloEsperado: "Livro de teste",
      })
    ).rejects.toThrow(/emprestimo ativo/);
    const livro = await t.run(async (ctx) => await ctx.db.get(ativo));
    expect(livro).not.toBeNull();
  });
});

describe("biblioteca.importacao.gravarCapas", () => {
  it("grava a capa nova e ignora livro que nao existe mais", async () => {
    const t = convexTest(schema, modules);
    const [livroId, apagadoId] = await t.run(async (ctx) => {
      const base = { ...livroBase, idioma: "Portugues", criadoEm: 0 };
      const a = await ctx.db.insert("livros", { ...base, capaUrl: "https://cdn.yhc.com.br/biblioteca-capas/pequena.jpg" });
      const b = await ctx.db.insert("livros", base);
      await ctx.db.delete(b);
      return [a, b];
    });

    const nova = "https://cdn.yhc.com.br/biblioteca-capas/grande.jpg";
    const r = await t.mutation(internal.biblioteca.importacao.gravarCapas, {
      trocas: [
        { livroId, capaUrl: nova },
        { livroId: apagadoId, capaUrl: nova },
      ],
    });

    expect(r).toEqual({ gravadas: 1, ausentes: [apagadoId] });
    const livro = await t.run((ctx) => ctx.db.get(livroId));
    expect(livro?.capaUrl).toBe(nova);
  });
});
