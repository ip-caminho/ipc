import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, seedUserComMembro, as } from "./helpers";

// multimidia e biblioteca exigiam apenas login: as permissoes existiam no RBAC
// (e a UI ja escondia os botoes com can("multimidia:update") /
// PermissionGate biblioteca:*), mas o backend nao checava. Nenhum papel base
// tem multimidia:* — so o set voluntario_multimidia.

async function seedCulto(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("cultos", {
      data: "2026-08-02",
      tipo: "DOMINICAL",
      status: "PUBLICADO",
    })
  );
}

async function seedLivro(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("livros", {
      titulo: "Institutas",
      autores: ["Calvino"],
      categorias: ["Teologia"],
      criadoEm: 1,
    })
  );
}

describe("multimidia.mutations — exigem permissao", () => {
  it("criarNota: membro comum recusa", async () => {
    const t = convexTest(schema, modules);
    const cultoId = await seedCulto(t);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      as(t, userId).mutation(api.multimidia.mutations.criarNota, {
        cultoId,
        texto: "nota",
      })
    ).rejects.toThrow();
  });

  it("criarNota: com multimidia:update funciona (voluntario_multimidia)", async () => {
    const t = convexTest(schema, modules);
    const cultoId = await seedCulto(t);
    const userId = await seedUser(t, {
      role: "membro",
      permissions: ["multimidia:update"],
    });
    const id = await as(t, userId).mutation(api.multimidia.mutations.criarNota, {
      cultoId,
      texto: "nota",
    });
    expect(id).toBeDefined();
  });

  it("initChecklist: membro comum recusa", async () => {
    const t = convexTest(schema, modules);
    const cultoId = await seedCulto(t);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.multimidia.mutations.initChecklist, { cultoId })
    ).rejects.toThrow();
  });
});

describe("biblioteca.mutations — exigem permissao", () => {
  it("create: membro comum recusa; com biblioteca:create funciona", async () => {
    const t = convexTest(schema, modules);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      as(t, comum).mutation(api.biblioteca.mutations.create, {
        titulo: "Novo",
        autores: ["X"],
        categorias: ["Teologia"],
      })
    ).rejects.toThrow();

    const bibliotecario = await seedUser(t, {
      role: "secretaria",
      permissions: ["biblioteca:create"],
    });
    const id = await as(t, bibliotecario).mutation(api.biblioteca.mutations.create, {
      titulo: "Novo",
      autores: ["X"],
      categorias: ["Teologia"],
    });
    expect(id).toBeDefined();
  });

  it("emprestar: membro comum nao registra emprestimo em nome de outro", async () => {
    const t = convexTest(schema, modules);
    const livroId = await seedLivro(t);
    const exemplarId = await t.run(async (ctx) =>
      await ctx.db.insert("exemplares", {
        livroId,
        codigo: "EX-1",
        condicao: "BOM",
        status: "DISPONIVEL",
        dataAquisicao: "2026-01-01",
      })
    );
    const { membroId: alvoMembroId } = await seedUserComMembro(t, { role: "membro" });

    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.biblioteca.mutations.emprestar, {
        exemplarId,
        membroId: alvoMembroId,
      })
    ).rejects.toThrow();
  });
});

describe("biblioteca.devolver — permissao OU dono do emprestimo", () => {
  async function seedEmprestimo(t: ReturnType<typeof convexTest>, membroId: string) {
    const livroId = await seedLivro(t);
    return await t.run(async (ctx) => {
      const exemplarId = await ctx.db.insert("exemplares", {
        livroId,
        codigo: "EX-1",
        condicao: "BOM",
        status: "EMPRESTADO",
        dataAquisicao: "2026-01-01",
      });
      return await ctx.db.insert("emprestimos", {
        livroId,
        exemplarId,
        membroId: membroId as any,
        status: "ATIVO",
        dataEmprestimo: "2026-07-01",
        dataPrevistaDevolucao: "2026-07-15",
        registradoPor: membroId as any,
      });
    });
  }

  // /biblioteca/meus-emprestimos usa esta mutation: membro comum PRECISA devolver o proprio
  it("dono devolve o proprio emprestimo mesmo sem biblioteca:emprestar", async () => {
    const t = convexTest(schema, modules);
    const { userId, membroId } = await seedUserComMembro(t, { role: "membro" });
    const emprestimoId = await seedEmprestimo(t, membroId);

    await as(t, userId).mutation(api.biblioteca.mutations.devolver, { emprestimoId });
    const doc = await t.run(async (ctx) => await ctx.db.get(emprestimoId));
    expect(doc?.status).toBe("DEVOLVIDO");
  });

  it("membro comum NAO devolve emprestimo de outro", async () => {
    const t = convexTest(schema, modules);
    const { membroId: donoMembroId } = await seedUserComMembro(t, { role: "membro" });
    const emprestimoId = await seedEmprestimo(t, donoMembroId);

    const intruso = await seedUser(t, { role: "membro" });
    await expect(
      as(t, intruso).mutation(api.biblioteca.mutations.devolver, { emprestimoId })
    ).rejects.toThrow();
    const doc = await t.run(async (ctx) => await ctx.db.get(emprestimoId));
    expect(doc?.status).toBe("ATIVO");
  });

  it("quem tem biblioteca:emprestar devolve de qualquer um", async () => {
    const t = convexTest(schema, modules);
    const { membroId: donoMembroId } = await seedUserComMembro(t, { role: "membro" });
    const emprestimoId = await seedEmprestimo(t, donoMembroId);

    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["biblioteca:emprestar"],
    });
    await as(t, gestor).mutation(api.biblioteca.mutations.devolver, { emprestimoId });
    const doc = await t.run(async (ctx) => await ctx.db.get(emprestimoId));
    expect(doc?.status).toBe("DEVOLVIDO");
  });
});
