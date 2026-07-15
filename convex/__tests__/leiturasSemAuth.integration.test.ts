import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";

// Estas queries iam direto ao ctx.db, sem nenhuma checagem: um anonimo obtinha
// a escala completa (nomes, fotos), o motivo de ausencia de cada membro e o
// contato (whatsapp/nascimento/bairro) de qualquer membro ativo.
//
// O gate e AUTENTICACAO, nao permissao: "membro" e "obreiro" nao tem
// escalas:read/diretorio:read e sao justamente o publico dessas telas. O site
// publico usa convex/public/*, que nao passa por aqui.

async function seedCulto(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("cultos", {
      data: "2026-08-02",
      tipo: "DOMINICAL",
      status: "PUBLICADO",
    })
  );
}

async function seedMembroComPII(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto: "Fulano de Tal",
      whatsapp: "+5511999998888",
      dataNascimento: "1985-04-12",
      endereco: {
        logradouro: "Rua Pedra Azul",
        numero: "674A",
        bairro: "Centro",
        cidade: "Sao Paulo",
        estado: "SP",
        cep: "00000-000",
      },
    });
    return await ctx.db.insert("membros", { entidadeId, role: "membro" });
  });
}

describe("escalas — leitura exige login (nao vaza para anonimo)", () => {
  it("listCultos: anonimo recebe []", async () => {
    const t = convexTest(schema, modules);
    await seedCulto(t);
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    expect(await t.query(api.escalas.queries.listCultos, {})).toEqual([]);
  });

  it("listCultos: membro comum (sem escalas:read) continua vendo", async () => {
    const t = convexTest(schema, modules);
    await seedCulto(t);
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.escalas.queries.listCultos, {});
    expect(r.length).toBe(1);
  });

  it("getProximoDomingo: anonimo recebe null (motivo de ausencia protegido)", async () => {
    const t = convexTest(schema, modules);
    await seedCulto(t);
    expect(
      await t.query(api.escalas.queries.getProximoDomingo, {})
    ).toBeNull();
  });

  it("getBoletim: anonimo recebe null", async () => {
    const t = convexTest(schema, modules);
    await seedCulto(t);
    expect(await t.query(api.escalas.queries.getBoletim, {})).toBeNull();
  });

  it("listEquipes: anonimo recebe [] (organograma com fotos)", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.escalas.equipes.listEquipes, {})).toEqual({});
  });

  it("disponibilidade.listPorData: anonimo recebe [] (motivo de ausencia)", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.query(api.escalas.disponibilidade.listPorData, { data: "2026-08-02" })
    ).toEqual([]);
  });

  it("disponibilidade.listPorData: membro comum continua vendo", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.escalas.disponibilidade.listPorData, {
      data: "2026-08-02",
    });
    expect(Array.isArray(r)).toBe(true);
  });
});

describe("membros.getPublicProfile — exige login", () => {
  it("anonimo NAO obtem whatsapp/nascimento/bairro", async () => {
    const t = convexTest(schema, modules);
    const membroId = await seedMembroComPII(t);
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    const r = await t.query(api.membros.queries.getPublicProfile, { id: membroId });
    expect(r).toBeNull();
  });

  it("membro comum (sem diretorio:read) continua vendo o perfil — popover", async () => {
    const t = convexTest(schema, modules);
    const membroId = await seedMembroComPII(t);
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.membros.queries.getPublicProfile, {
      id: membroId,
    });
    expect(r?.nome).toBe("Fulano de Tal");
  });
});

describe("gravacoes.series.list — exige login", () => {
  it("anonimo recebe []", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      await ctx.db.insert("serieGravacoes", { nome: "Serie X" })
    );
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    expect(await t.query(api.gravacoes.series.list, {})).toEqual([]);
  });

  it("membro logado continua vendo", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      await ctx.db.insert("serieGravacoes", { nome: "Serie X" })
    );
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).query(api.gravacoes.series.list, {});
    expect(r.length).toBe(1);
  });
});
