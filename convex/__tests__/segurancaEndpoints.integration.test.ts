import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

// Verifica o fix de seguranca (branch fix/seguranca-endpoints-publicos):
// - endpoints antes publicos/sem auth agora exigem permissao;
// - sem permissao degradam para vazio (nao lancam) para nao quebrar as
//   paginas que rodam useQuery antes de qualquer gate de render;
// - com a permissao certa continuam retornando os dados (sem regressao).

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { role: string; permissions?: string[] }
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto: `Membro ${opts.role}`,
    });
    await ctx.db.insert("membros", {
      entidadeId,
      role: opts.role,
      userId,
      permissions: opts.permissions,
    });
    return userId;
  });
}

const as = (t: ReturnType<typeof convexTest>, userId: string) =>
  t.withIdentity({ subject: `${userId}|session-1` });

describe("entidades.queries — PII protegida", () => {
  it("list: sem auth retorna [] (nao lanca)", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.entidades.queries.list, {})).resolves.toEqual([]);
  });

  it("list: membro sem entidades:read retorna []", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.entidades.queries.list, {});
    expect(r).toEqual([]);
  });

  it("list: usuario com entidades:read recebe os dados (sem regressao)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["entidades:read"],
    });
    const r = await as(t, userId).query(api.entidades.queries.list, {});
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });

  it("getById: sem auth retorna null", async () => {
    const t = convexTest(schema, modules);
    const entidadeId = await t.run((ctx) =>
      ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Sigiloso",
      })
    );
    await expect(
      t.query(api.entidades.queries.getById, { id: entidadeId })
    ).resolves.toBeNull();
  });
});

describe("louvor.metricas — degrada sem quebrar", () => {
  it("louvoresNaoTocados: membro sem louvor:read retorna []", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("louvores", { titulo: "Hino", status: "ATIVO", criadoEm: 1 })
    );
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.louvor.metricas.louvoresNaoTocados, {});
    expect(r).toEqual([]);
  });

  it("louvoresNaoTocados: usuario com louvor:read recebe os dados", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("louvores", { titulo: "Hino", status: "ATIVO", criadoEm: 1 })
    );
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["louvor:read"],
    });
    const r = await as(t, userId).query(api.louvor.metricas.louvoresNaoTocados, {});
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("notifications.countSubscriptions — so admin", () => {
  it("nao-admin recebe null (nao lanca, pagina nao quebra)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.notifications.queries.countSubscriptions, {});
    expect(r).toBeNull();
  });

  it("admin recebe o total (numero)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "admin" });
    const r = await as(t, userId).query(api.notifications.queries.countSubscriptions, {});
    expect(typeof r).toBe("number");
  });
});
