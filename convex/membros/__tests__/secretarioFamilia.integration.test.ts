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

  it("membro solteiro e seu proprio chefe", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const solo = await pessoa(t, "Solteiro Silva", "M");

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const l = linhas.find((x) => x.entidade.nomeCompleto === "Solteiro Silva")!;
    expect(l.familiaHeadId).toBe(solo.entidadeId as Id<"entidades">);
    expect(l.familiaOrder).toBe(0);
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
