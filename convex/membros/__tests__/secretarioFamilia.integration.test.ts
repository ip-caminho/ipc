import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";

async function seedAdmin(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: "Admin",
    });
    await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
  });
  return t.withIdentity({ subject: `${userId}|s` });
}

async function pessoa(
  t: ReturnType<typeof convexTest>,
  nome: string,
  sexo: "M" | "F",
  dataNascimento?: string
) {
  return t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: nome,
      sexo,
      dataNascimento,
    });
    const membroId = await ctx.db.insert("membros", { entidadeId, role: "membro" });
    return { entidadeId, membroId };
  });
}

describe("listParaSecretario — agrupamento por familia", () => {
  it("chefe=homem, conjuge=esposa, filhos como dependentes", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    const pai = await pessoa(t, "Joao Pai", "M");
    const mae = await pessoa(t, "Maria Mae", "F");
    const f1 = await pessoa(t, "Filho Velho", "M", "2010-03-01");
    const f2 = await pessoa(t, "Filha Nova", "F", "2015-08-20");

    await t.run(async (ctx) => {
      // casal
      await ctx.db.patch(pai.membroId, { conjugeId: mae.entidadeId });
      await ctx.db.patch(mae.membroId, { conjugeId: pai.entidadeId });
      // filhos vinculados ao pai e a mae
      for (const filho of [f1, f2]) {
        await ctx.db.insert("responsaveis", {
          criancaEntidadeId: filho.entidadeId,
          responsavelEntidadeId: pai.entidadeId,
          tipo: "PAI",
          principal: true,
          criadoEm: 1,
        });
        await ctx.db.insert("responsaveis", {
          criancaEntidadeId: filho.entidadeId,
          responsavelEntidadeId: mae.entidadeId,
          tipo: "MAE",
          principal: false,
          criadoEm: 1,
        });
      }
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const by = (nome: string) => linhas.find((l) => l.entidade.nomeCompleto === nome)!;

    const headId = pai.entidadeId;
    expect(by("Joao Pai").familiaHeadId).toBe(headId);
    expect(by("Joao Pai").familiaOrder).toBe(0);
    expect(by("Maria Mae").familiaHeadId).toBe(headId);
    expect(by("Maria Mae").familiaOrder).toBe(1);
    expect(by("Filho Velho").familiaHeadId).toBe(headId);
    expect(by("Filho Velho").familiaOrder).toBe(2);
    expect(by("Filha Nova").familiaHeadId).toBe(headId);
    expect(by("Filha Nova").familiaOrder).toBe(2);
    // datas presentes para o cliente ordenar (mais velho primeiro)
    expect(by("Filho Velho").dataNascimento).toBe("2010-03-01");
    expect(by("Filha Nova").dataNascimento).toBe("2015-08-20");
  });

  it("inclui filho DEPENDENTE (entidade sem membro) na familia", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const pai = await pessoa(t, "Andre Pai", "M");

    // Noah: entidade dependente, SEM registro de membro
    const noahEnt = await t.run(async (ctx) => {
      const e = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Noah Dependente",
        vinculoIgreja: "NAO_MEMBRO",
        dataNascimento: "2020-01-01",
      });
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: e,
        responsavelEntidadeId: pai.entidadeId,
        tipo: "PAI",
        principal: true,
        criadoEm: 1,
      });
      return e;
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const noah = linhas.find((l) => l.entidade.nomeCompleto === "Noah Dependente");
    expect(noah).toBeTruthy();
    expect(noah!.ehMembro).toBe(false);
    expect(noah!.entidadeId).toBe(noahEnt as Id<"entidades">);
    expect(noah!.familiaHeadId).toBe(pai.entidadeId);
    expect(noah!.familiaOrder).toBe(2);
  });

  it("tornarMembro promove dependente a membro", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    const entId = await t.run(async (ctx) =>
      ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Crianca Promovida",
        vinculoIgreja: "NAO_MEMBRO",
      })
    );

    const res = await admin.mutation(api.membros.eclesiastico.tornarMembro, {
      entidadeId: entId,
    });
    expect(res.jaEra).toBe(false);

    const { membro, entidade } = await t.run(async (ctx) => {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", entId))
        .first();
      const e = await ctx.db.get(entId);
      return { membro: m, entidade: e };
    });
    expect(membro).toBeTruthy();
    expect(membro?.cargoEclesiastico).toBe("MEMBRO_NAO_COMUNGANTE");
    expect(entidade?.vinculoIgreja).toBe("MEMBRO");
    expect(entidade?.papeis).toContain("MEMBRO");
    expect(entidade?.papeis).not.toContain("DEPENDENTE");

    // idempotente
    const dupe = await admin.mutation(api.membros.eclesiastico.tornarMembro, {
      entidadeId: entId,
    });
    expect(dupe.jaEra).toBe(true);
  });

  it("membro solteiro e seu proprio chefe", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const solo = await pessoa(t, "Solteiro Silva", "M");

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const l = linhas.find((x) => x.entidade.nomeCompleto === "Solteiro Silva")!;
    expect(l.familiaHeadId).toBe(solo.entidadeId as Id<"entidades">);
    expect(l.familiaOrder).toBe(0);
  });

  it("deriva rolCategoria de cargo + status", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    await pessoa(t, "Com Ungante", "M");
    const naoComungante = await pessoa(t, "Nao Comungante", "F");
    const transferido = await pessoa(t, "Foi Transferido", "M");
    await t.run(async (ctx) => {
      await ctx.db.patch(naoComungante.membroId, {
        cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
      });
      await ctx.db.patch(transferido.entidadeId, { status: "TRANSFERIDO" });
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const by = (n: string) => linhas.find((l) => l.entidade.nomeCompleto === n)!;
    expect(by("Com Ungante").rolCategoria).toBe("PRINCIPAL");
    expect(by("Nao Comungante").rolCategoria).toBe("SEPARADO");
    expect(by("Foi Transferido").rolCategoria).toBe("ARQUIVO");
  });

  it("vincularConjugeAdmin liga os dois lados", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const a = await pessoa(t, "Esposo A", "M");
    const b = await pessoa(t, "Esposa B", "F");

    await admin.mutation(api.membros.eclesiastico.vincularConjugeAdmin, {
      membroId: a.membroId,
      conjugeEntidadeId: b.entidadeId,
    });

    const { ma, mb } = await t.run(async (ctx) => ({
      ma: await ctx.db.get(a.membroId),
      mb: await ctx.db.get(b.membroId),
    }));
    expect(ma?.conjugeId).toBe(b.entidadeId);
    expect(mb?.conjugeId).toBe(a.entidadeId);
  });

  it("adicionarFilhoAdmin cria dependente vinculado e aparece na familia", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const pai = await pessoa(t, "Pai Admin", "M");

    await admin.mutation(api.membros.eclesiastico.adicionarFilhoAdmin, {
      responsavelMembroId: pai.membroId,
      nomeCompleto: "Filho Criado",
      dataNascimento: "2018-05-05",
      sexo: "M",
      batismoInfantil: false,
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const filho = linhas.find((l) => l.entidade.nomeCompleto === "Filho Criado");
    expect(filho).toBeTruthy();
    expect(filho!.ehMembro).toBe(false);
    expect(filho!.familiaHeadId).toBe(pai.entidadeId);
    expect(filho!.familiaOrder).toBe(2);
  });

  it("filtra por busca mantendo metadados", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await pessoa(t, "Pedro Pesquisa", "M");
    await pessoa(t, "Outro Nome", "F");

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {
      search: "pesquisa",
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0].entidade.nomeCompleto).toBe("Pedro Pesquisa");
  });
});
