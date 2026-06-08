import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
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

describe("acesso ouvinte — isolamento do Rol", () => {
  it("ouvinte criado nao aparece no diretorio nem no Rol, mas aparece em ouvinte.listar", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    // Um membro de verdade
    await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Membro Real",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });

    // Um ouvinte via mutation oficial
    const { membroId } = await admin.mutation(api.membros.ouvinte.criarOuvinte, {
      nome: "Visitante Ouvinte",
      whatsapp: "11999990000",
    });

    // Entidade do ouvinte: vinculo FREQUENTADOR + acessoExpiraEm setado
    const ent = await t.run(async (ctx) => {
      const m = await ctx.db.get(membroId);
      expect(m?.acessoExpiraEm).toBeGreaterThan(Date.now());
      return ctx.db.get(m!.entidadeId);
    });
    expect(ent?.vinculoIgreja).toBe("FREQUENTADOR");

    // Diretorio/lista de membros NAO inclui o ouvinte
    const lista = await admin.query(api.membros.queries.list, { status: "TODOS" });
    expect(lista.some((r: any) => r.role === "ouvinte")).toBe(false);
    expect(lista.some((r: any) => r.entidade.nomeCompleto === "Membro Real")).toBe(true);

    // Rol do secretario NAO inclui o ouvinte
    const rol = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    expect(
      rol.some((l: any) => l.entidade.nomeCompleto === "Visitante Ouvinte")
    ).toBe(false);

    // Painel de ouvintes INCLUI o ouvinte
    const ouvintes = await admin.query(api.membros.ouvinte.listar, {});
    expect(ouvintes.some((o: any) => o.nome === "Visitante Ouvinte")).toBe(true);
  });

  it("ouvinte ativo tem so gravacoes:read; expirado perde o contexto", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    const { membroId } = await admin.mutation(api.membros.ouvinte.criarOuvinte, {
      nome: "Ouvinte Login",
      whatsapp: "11988887777",
    });

    // Simula ativacao: vincula userId
    const ouvinteUserId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {});
      await ctx.db.patch(membroId, { userId: uid });
      return uid;
    });
    const ouvinte = t.withIdentity({ subject: `${ouvinteUserId}|s` });

    // Contexto: role ouvinte, permissao unica
    const ctx1 = await ouvinte.query(api.preferencias.rbac.getUserPermissionContext, {});
    expect(ctx1?.role).toBe("ouvinte");
    expect(ctx1?.permissions).toEqual(["gravacoes:read"]);

    // Expira o acesso → contexto vira null (acesso bloqueado)
    await t.run(async (ctx) => {
      await ctx.db.patch(membroId, { acessoExpiraEm: Date.now() - 1000 });
    });
    const ctx2 = await ouvinte.query(api.preferencias.rbac.getUserPermissionContext, {});
    expect(ctx2).toBeNull();
  });
});
