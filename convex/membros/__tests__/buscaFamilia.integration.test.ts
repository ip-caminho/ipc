import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

type T = ReturnType<typeof convexTest>;

async function seedEntidade(t: T, nomeCompleto: string, status = "ATIVO") {
  return t.run((ctx) =>
    ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: status as any,
      nomeCompleto,
    }),
  );
}

async function seedMembroComUser(t: T, nome: string, role = "membro") {
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: nome,
    });
    await ctx.db.insert("membros", { entidadeId: eid, role, userId });
  });
  return t.withIdentity({ subject: `${userId}|s` });
}

describe("busca de familia por searchIndex + fallback substring", () => {
  it("searchMembersForFamily: prefixo via indice, substring via fallback, status e self filtrados", async () => {
    const t = convexTest(schema, modules);
    const ctx = await seedMembroComUser(t, "Eu Mesmo");
    await seedEntidade(t, "Maria Silva");
    await seedEntidade(t, "Joao Pereira");
    await seedEntidade(t, "Maria Inativa", "INATIVO");

    // Prefixo por token: "mar" casa "Maria Silva" (e nao "Joao")
    const prefixo = await ctx.query(api.membros.selfService.searchMembersForFamily, { search: "mar" });
    const nomesPrefixo = prefixo.map((r) => r.nomeCompleto);
    expect(nomesPrefixo).toContain("Maria Silva");
    expect(nomesPrefixo).not.toContain("Joao Pereira");
    // Inativos nunca aparecem
    expect(nomesPrefixo).not.toContain("Maria Inativa");

    // Substring no meio da palavra: "ria" nao casa prefixo -> fallback
    const sub = await ctx.query(api.membros.selfService.searchMembersForFamily, { search: "ria" });
    expect(sub.map((r) => r.nomeCompleto)).toContain("Maria Silva");
  });

  it("buscarEntidadesFamilia: marca ehMembro e respeita exclusao", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedMembroComUser(t, "Admin", "admin");
    const eMembro = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Pedro Membro",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
      return eid;
    });
    const eNaoMembro = await seedEntidade(t, "Pedro NaoMembro");

    const res = await admin.query(api.membros.eclesiastico.buscarEntidadesFamilia, { termo: "pedro" });
    const byId = new Map(res.map((r) => [r.entidadeId, r]));
    expect(byId.get(eMembro)?.ehMembro).toBe(true);
    expect(byId.get(eNaoMembro)?.ehMembro).toBe(false);

    // Exclusao remove a entidade do resultado
    const semUm = await admin.query(api.membros.eclesiastico.buscarEntidadesFamilia, {
      termo: "pedro",
      excluirEntidadeId: eMembro,
    });
    expect(semUm.find((r) => r.entidadeId === eMembro)).toBeUndefined();
  });
});
