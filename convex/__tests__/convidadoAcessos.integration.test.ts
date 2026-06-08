import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

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

describe("acessos do convidado", () => {
  it("registra so com codigo valido e relatorio agrega (admin)", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const { token } = await admin.mutation(api.appConfig.mutations.gerarTokenConvidado, {});

    // Codigo invalido → nao registra
    const r1 = await t.mutation(api.convidado.registrarAcesso, { codigo: "errado", ip: "1.1.1.1" });
    expect(r1.ok).toBe(false);

    // Validos: dois acessos, IPs repetidos para testar unicos
    await t.mutation(api.convidado.registrarAcesso, { codigo: token, ip: "200.1.1.1", userAgent: "Mozilla/5.0 (iPhone)" });
    await t.mutation(api.convidado.registrarAcesso, { codigo: token, ip: "200.1.1.1", userAgent: "Mozilla/5.0 (Windows)" });
    await t.mutation(api.convidado.registrarAcesso, { codigo: token, ip: "200.2.2.2" });

    const rel = await admin.query(api.convidado.relatorioAcessos, {});
    expect(rel).not.toBeNull();
    expect(rel!.total).toBe(3);
    expect(rel!.ipsUnicos).toBe(2);
    expect(rel!.ultimo).toBeGreaterThan(0);
    expect(rel!.lista.length).toBe(3);
  });

  it("relatorio nega para nao-admin", async () => {
    const t = convexTest(schema, modules);
    await seedAdmin(t);
    const rel = await t.query(api.convidado.relatorioAcessos, {});
    expect(rel).toBeNull();
  });
});
