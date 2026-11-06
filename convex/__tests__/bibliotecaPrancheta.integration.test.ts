import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { getSaoPauloDateString } from "../_shared/datetime";
import { somarDias } from "../biblioteca/prazo";
import { seedUser, seedUserComMembro, as } from "./helpers";

const novoTeste = () => convexTest(schema, modules);
type T = ReturnType<typeof novoTeste>;

const PERMISSOES = ["biblioteca:read", "biblioteca:create", "biblioteca:emprestar"];

async function voluntario(t: T) {
  return as(t, await seedUser(t, { role: "voluntario_biblioteca", permissions: PERMISSOES }));
}

async function criarLivro(t: T, titulo: string) {
  const v = await voluntario(t);
  // @ts-ignore Convex TS2589
  const livroId = await v.mutation(api.biblioteca.mutations.create, {
    titulo,
    autores: ["Autor"],
    categorias: ["Teologia"],
    condicao: "BOM",
  });
  const exemplar = await t.run(async (ctx) =>
    ctx.db.query("exemplares").withIndex("by_livro", (q) => q.eq("livroId", livroId)).first()
  );
  return { livroId, exemplarId: exemplar!._id, codigo: exemplar!.codigo };
}

describe("biblioteca.mutations.emprestar", () => {
  it("empresta para membro com prazo de 4 semanas a partir de hoje em Sao Paulo", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const { membroId } = await seedUserComMembro(t, { role: "membro" });
    const v = await voluntario(t);

    const id = await v.mutation(api.biblioteca.mutations.emprestar, { exemplarId, membroId });

    const hoje = getSaoPauloDateString();
    const emprestimo = await t.run(async (ctx) => ctx.db.get(id));
    expect(emprestimo).toMatchObject({
      membroId,
      dataEmprestimo: hoje,
      dataPrevistaDevolucao: somarDias(hoje, 28),
    });
    expect(await t.run(async (ctx) => (await ctx.db.get(exemplarId))?.status)).toBe("EMPRESTADO");
  });

  it("empresta para pessoa sem cadastro, com o telefone em E.164", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);

    const id = await v.mutation(api.biblioteca.mutations.emprestar, {
      exemplarId,
      pessoaNome: "  Jorge Visitante ",
      pessoaWhatsapp: "11999998888",
    });

    expect(await t.run(async (ctx) => ctx.db.get(id))).toMatchObject({
      pessoaNome: "Jorge Visitante",
      pessoaWhatsapp: "+5511999998888",
    });
  });

  it("recusa nome sem WhatsApp valido, ninguem informado, e membro junto com nome", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const { membroId } = await seedUserComMembro(t, { role: "membro" });
    const v = await voluntario(t);
    const emprestar = api.biblioteca.mutations.emprestar;

    await expect(v.mutation(emprestar, { exemplarId, pessoaNome: "Jorge" })).rejects.toThrow("WhatsApp");
    await expect(
      v.mutation(emprestar, { exemplarId, pessoaNome: "Jorge", pessoaWhatsapp: "123" })
    ).rejects.toThrow("WhatsApp");
    await expect(v.mutation(emprestar, { exemplarId })).rejects.toThrow("para quem");
    await expect(
      v.mutation(emprestar, { exemplarId, membroId, pessoaNome: "Jorge" })
    ).rejects.toThrow("não os dois");
  });

  it("mantem o limite de 3 para membro, mas nao para nome digitado", async () => {
    const t = novoTeste();
    const { membroId } = await seedUserComMembro(t, { role: "membro" });
    const v = await voluntario(t);
    const emprestar = api.biblioteca.mutations.emprestar;

    for (const titulo of ["A", "B", "C"]) {
      const { exemplarId } = await criarLivro(t, titulo);
      await v.mutation(emprestar, { exemplarId, membroId });
    }
    const { exemplarId: quarto } = await criarLivro(t, "D");
    await expect(v.mutation(emprestar, { exemplarId: quarto, membroId })).rejects.toThrow("Limite");

    for (const titulo of ["E", "F", "G", "H"]) {
      const { exemplarId } = await criarLivro(t, titulo);
      await v.mutation(emprestar, { exemplarId, pessoaNome: "Jorge", pessoaWhatsapp: "11999998888" });
    }
  });

  it("exige permissao de emprestar", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const leitor = as(t, await seedUser(t, { role: "membro", permissions: ["biblioteca:read"] }));

    await expect(
      leitor.mutation(api.biblioteca.mutations.emprestar, {
        exemplarId,
        pessoaNome: "Jorge",
        pessoaWhatsapp: "11999998888",
      })
    ).rejects.toThrow();
  });
});

describe("biblioteca.queries.listAtivos", () => {
  it("lista do mais antigo ao mais novo, com nome e WhatsApp das duas origens", async () => {
    const t = novoTeste();
    const a = await criarLivro(t, "Livro A");
    const b = await criarLivro(t, "Livro B");
    const c = await criarLivro(t, "Livro C");
    const { membroId } = await seedUserComMembro(t, { role: "membro" });
    await t.run(async (ctx) => {
      const membro = await ctx.db.get(membroId);
      await ctx.db.patch(membro!.entidadeId, { whatsapp: "+5511911112222" });
      const base = { dataPrevistaDevolucao: "2999-01-01", status: "ATIVO" as const };
      await ctx.db.insert("emprestimos", {
        ...base, exemplarId: a.exemplarId, livroId: a.livroId, membroId, dataEmprestimo: "2026-10-20",
      });
      await ctx.db.insert("emprestimos", {
        ...base, exemplarId: b.exemplarId, livroId: b.livroId, dataEmprestimo: "2026-10-01",
        pessoaNome: "Jorge", pessoaWhatsapp: "+5511999998888",
      });
      await ctx.db.insert("emprestimos", {
        ...base, exemplarId: c.exemplarId, livroId: c.livroId, membroId, dataEmprestimo: "2026-01-01",
        status: "DEVOLVIDO",
      });
    });
    const v = await voluntario(t);

    const linhas = await v.query(api.biblioteca.queries.listAtivos, {});

    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({ livroTitulo: "Livro B", pessoa: "Jorge", whatsapp: "+5511999998888" });
    expect(linhas[1]).toMatchObject({ livroTitulo: "Livro A", pessoa: "Membro membro", whatsapp: "+5511911112222" });
  });

  it("nao abre para quem so le", async () => {
    const t = novoTeste();
    const leitor = as(t, await seedUser(t, { role: "membro", permissions: ["biblioteca:read"] }));
    await expect(leitor.query(api.biblioteca.queries.listAtivos, {})).rejects.toThrow();
  });
});

describe("devolucao de pessoa sem cadastro", () => {
  it("apaga o telefone, mantem o nome e nao mostra telefone a quem so le", async () => {
    const t = novoTeste();
    const { livroId, exemplarId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);
    const leitor = as(t, await seedUser(t, { role: "membro", permissions: ["biblioteca:read"] }));
    const id = await v.mutation(api.biblioteca.mutations.emprestar, {
      exemplarId,
      pessoaNome: "Jorge",
      pessoaWhatsapp: "11999998888",
    });

    const aberto = await leitor.query(api.biblioteca.queries.listEmprestimos, { livroId });
    expect(aberto[0].membroNome).toBe("Jorge");
    expect(aberto[0]).not.toHaveProperty("pessoaWhatsapp");

    await v.mutation(api.biblioteca.mutations.devolver, { emprestimoId: id });

    const devolvido = await t.run(async (ctx) => ctx.db.get(id));
    expect(devolvido).toMatchObject({ status: "DEVOLVIDO", pessoaNome: "Jorge" });
    expect(devolvido?.pessoaWhatsapp).toBeUndefined();
    expect(await t.run(async (ctx) => (await ctx.db.get(exemplarId))?.status)).toBe("DISPONIVEL");
  });

  it("nome digitado nao devolve em nome de membro comum", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);
    const comum = as(t, await seedUser(t, { role: "membro" }));
    const id = await v.mutation(api.biblioteca.mutations.emprestar, {
      exemplarId,
      pessoaNome: "Jorge",
      pessoaWhatsapp: "11999998888",
    });

    await expect(comum.mutation(api.biblioteca.mutations.devolver, { emprestimoId: id })).rejects.toThrow();
  });
});

describe("saida da estante", () => {
  it("encerra o emprestimo aberto, tira do catalogo publico e pode ser desfeita", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);
    const id = await v.mutation(api.biblioteca.mutations.emprestar, {
      exemplarId,
      pessoaNome: "Jorge",
      pessoaWhatsapp: "11999998888",
    });

    await v.mutation(api.biblioteca.mutations.retirarDaEstante, { exemplarId });

    const emprestimo = await t.run(async (ctx) => ctx.db.get(id));
    expect(emprestimo?.status).toBe("DEVOLVIDO");
    expect(emprestimo?.pessoaWhatsapp).toBeUndefined();
    expect(await t.run(async (ctx) => (await ctx.db.get(exemplarId))?.status)).toBe("PERDIDO");
    expect(await v.query(api.biblioteca.queries.listAtivos, {})).toHaveLength(0);
    expect(await t.query(api.public.acervo.catalogo, {})).toHaveLength(0);

    await v.mutation(api.biblioteca.mutations.voltarParaEstante, { exemplarId });

    expect(await t.run(async (ctx) => (await ctx.db.get(exemplarId))?.status)).toBe("DISPONIVEL");
    expect(await t.query(api.public.acervo.catalogo, {})).toHaveLength(1);
  });

  it("no catalogo, livro com dois exemplares conta so o que esta na estante", async () => {
    const t = novoTeste();
    const { livroId, exemplarId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);
    await v.mutation(api.biblioteca.mutations.addExemplar, { livroId, condicao: "BOM" });

    await v.mutation(api.biblioteca.mutations.retirarDaEstante, { exemplarId });

    const [livro] = await t.query(api.public.acervo.catalogo, {});
    expect(livro).toMatchObject({ totalExemplares: 1, disponiveis: 1 });
  });

  it("nao abre para quem so le", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Livro A");
    const leitor = as(t, await seedUser(t, { role: "membro", permissions: ["biblioteca:read"] }));
    await expect(
      leitor.mutation(api.biblioteca.mutations.retirarDaEstante, { exemplarId })
    ).rejects.toThrow();
  });
});

describe("buscas do formulario de emprestimo", () => {
  it("acha pelo titulo e informa quando nao ha exemplar na estante", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Vida em comunhao");
    await criarLivro(t, "Outro assunto");
    const v = await voluntario(t);
    const buscar = api.biblioteca.queries.buscarLivrosParaEmprestar;

    const achados = await v.query(buscar, { termo: "comunhao" });
    expect(achados).toHaveLength(1);
    expect(achados[0]).toMatchObject({ titulo: "Vida em comunhao", exemplarId });

    await v.mutation(api.biblioteca.mutations.emprestar, {
      exemplarId,
      pessoaNome: "Jorge",
      pessoaWhatsapp: "11999998888",
    });
    expect((await v.query(buscar, { termo: "comunhao" }))[0].exemplarId).toBeNull();
  });

  it("acha pelo codigo da etiqueta, com ou sem prefixo, e prefere esse exemplar", async () => {
    const t = novoTeste();
    const { livroId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);
    const segundoId = await v.mutation(api.biblioteca.mutations.addExemplar, { livroId, condicao: "BOM" });
    const segundo = await t.run(async (ctx) => ctx.db.get(segundoId));
    const numero = segundo!.codigo.replace("BIB-", "");
    const buscar = api.biblioteca.queries.buscarLivrosParaEmprestar;

    for (const termo of [segundo!.codigo, segundo!.codigo.toLowerCase(), numero, String(Number(numero))]) {
      const achados = await v.query(buscar, { termo });
      expect(achados).toHaveLength(1);
      expect(achados[0].exemplarId).toBe(segundoId);
    }
  });

  it("sem resultado na busca, confere sem acento e tambem pelo autor", async () => {
    const t = novoTeste();
    const { exemplarId } = await criarLivro(t, "Oração e jejum");
    const v = await voluntario(t);
    const buscar = api.biblioteca.queries.buscarLivrosParaEmprestar;

    expect((await v.query(buscar, { termo: "oracao" }))[0]).toMatchObject({ exemplarId });
    expect((await v.query(buscar, { termo: "autor" }))[0]).toMatchObject({ exemplarId });
    expect(await v.query(buscar, { termo: "inexistente" })).toEqual([]);
  });

  it("traz o livro ja escolhido pelo id", async () => {
    const t = novoTeste();
    const { livroId, exemplarId } = await criarLivro(t, "Livro A");
    const v = await voluntario(t);
    const achados = await v.query(api.biblioteca.queries.buscarLivrosParaEmprestar, { livroId });
    expect(achados[0]).toMatchObject({ livroId, exemplarId });
  });

  it("busca pessoa so entre membros ativos", async () => {
    const t = novoTeste();
    const v = await voluntario(t);
    const { membroId } = await t.run(async (ctx) => {
      const ativa = await ctx.db.insert("entidades", {
        tipoEntidade: "PF", papeis: [], status: "ATIVO", nomeCompleto: "Marina Alves",
      });
      const inativa = await ctx.db.insert("entidades", {
        tipoEntidade: "PF", papeis: [], status: "INATIVO", nomeCompleto: "Marina Inativa",
      });
      await ctx.db.insert("entidades", {
        tipoEntidade: "PF", papeis: [], status: "ATIVO", nomeCompleto: "Marina Sem Cadastro",
      });
      await ctx.db.insert("membros", { entidadeId: inativa, role: "membro" });
      return { membroId: await ctx.db.insert("membros", { entidadeId: ativa, role: "membro" }) };
    });

    expect(await v.query(api.biblioteca.queries.buscarPessoas, { termo: "Marina" })).toEqual([
      { membroId, nome: "Marina Alves" },
    ]);
    expect(await v.query(api.biblioteca.queries.buscarPessoas, { termo: "M" })).toEqual([]);
  });

  it("busca pessoa sem acento, so entre membros ativos", async () => {
    const t = novoTeste();
    const v = await voluntario(t);
    const membroId = await t.run(async (ctx) => {
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF", papeis: [], status: "ATIVO", nomeCompleto: "João Conceição",
      });
      const inativa = await ctx.db.insert("entidades", {
        tipoEntidade: "PF", papeis: [], status: "INATIVO", nomeCompleto: "João Inativo",
      });
      await ctx.db.insert("membros", { entidadeId: inativa, role: "membro" });
      return ctx.db.insert("membros", { entidadeId, role: "membro" });
    });

    expect(await v.query(api.biblioteca.queries.buscarPessoas, { termo: "joao" })).toEqual([
      { membroId, nome: "João Conceição" },
    ]);
  });
});
