import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";

// As mutations de turmas checavam apenas login — e cancelarInscricao nao
// checava NADA (anonimo cancelava inscricao de qualquer um). Encontros e
// presencas nao podem exigir so a permissao: o instrutor da turma tambem faz a
// chamada (widget do dashboard) e pode ser membro comum — por isso o gate e
// "turmas:manage_inscricoes OU instrutor da propria turma".

const turmaBase = {
  nome: "Catecumenos 2026",
  dataInicio: "2026-08-01",
  camposSistema: ["nomeCompleto"],
};

async function seedTurma(
  t: ReturnType<typeof convexTest>,
  instrutorId?: string
) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("turmas", {
      ...turmaBase,
      instrutorId: instrutorId as any,
      vagasOcupadas: 0,
      status: "ABERTA",
      token: "tok-teste",
      criadoEm: 1,
    })
  );
}

describe("turmas.mutations — exigem permissao", () => {
  it("create: membro comum recusa; com turmas:create funciona", async () => {
    const t = convexTest(schema, modules);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      as(t, comum).mutation(api.turmas.mutations.create, turmaBase)
    ).rejects.toThrow();

    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:create"],
    });
    const id = await as(t, gestor).mutation(api.turmas.mutations.create, turmaBase);
    expect(id).toBeDefined();
  });

  it("updateStatus: membro comum nao cancela a turma", async () => {
    const t = convexTest(schema, modules);
    const turmaId = await seedTurma(t);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.mutations.updateStatus, {
        id: turmaId,
        status: "CANCELADA",
      })
    ).rejects.toThrow();
    const doc = await t.run(async (ctx) => await ctx.db.get(turmaId));
    expect(doc?.status).toBe("ABERTA");
  });
});

describe("turmas.cancelarInscricao — nao tinha gate nenhum", () => {
  async function seedInscricao(t: ReturnType<typeof convexTest>) {
    const turmaId = await seedTurma(t);
    const inscricaoId = await t.run(async (ctx) =>
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: "Inscrito" },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: 1,
      })
    );
    return { turmaId, inscricaoId };
  }

  it("anonimo NAO cancela inscricao (era possivel sem auth)", async () => {
    const t = convexTest(schema, modules);
    const { inscricaoId } = await seedInscricao(t);
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      t.mutation(api.turmas.mutations.cancelarInscricao, { id: inscricaoId })
    ).rejects.toThrow();
    const doc = await t.run(async (ctx) => await ctx.db.get(inscricaoId));
    expect(doc?.status).toBe("CONFIRMADA");
  });

  it("membro comum nao cancela inscricao de outro", async () => {
    const t = convexTest(schema, modules);
    const { inscricaoId } = await seedInscricao(t);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.mutations.cancelarInscricao, { id: inscricaoId })
    ).rejects.toThrow();
  });

  it("com turmas:manage_inscricoes cancela (sem regressao)", async () => {
    const t = convexTest(schema, modules);
    const { inscricaoId } = await seedInscricao(t);
    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:manage_inscricoes"],
    });
    await as(t, gestor).mutation(api.turmas.mutations.cancelarInscricao, {
      id: inscricaoId,
    });
    const doc = await t.run(async (ctx) => await ctx.db.get(inscricaoId));
    expect(doc?.status).toBe("CANCELADA");
  });
});

describe("turmas: encontros/presencas — permissao OU instrutor da propria turma", () => {
  it("membro comum sem vinculo com a turma recusa", async () => {
    const t = convexTest(schema, modules);
    const turmaId = await seedTurma(t);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.mutations.createEncontro, {
        turmaId,
        data: "2026-08-05",
      })
    ).rejects.toThrow();
  });

  // O caso que exigir so a permissao quebraria: instrutor e membro comum.
  it("instrutor membro comum cria encontro da PROPRIA turma", async () => {
    const t = convexTest(schema, modules);
    const instrutorUserId = await seedUser(t, { role: "membro" });
    const instrutorMembroId = await t.run(async (ctx) => {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", instrutorUserId))
        .first();
      return m!._id;
    });
    const turmaId = await seedTurma(t, instrutorMembroId);

    const encontroId = await as(t, instrutorUserId).mutation(
      api.turmas.mutations.createEncontro,
      { turmaId, data: "2026-08-05" }
    );
    expect(encontroId).toBeDefined();
  });

  it("instrutor NAO mexe em encontro de turma alheia", async () => {
    const t = convexTest(schema, modules);
    const instrutorUserId = await seedUser(t, { role: "membro" });
    const instrutorMembroId = await t.run(async (ctx) => {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", instrutorUserId))
        .first();
      return m!._id;
    });
    await seedTurma(t, instrutorMembroId); // turma dele
    const outraTurma = await seedTurma(t); // turma de outro

    await expect(
      as(t, instrutorUserId).mutation(api.turmas.mutations.createEncontro, {
        turmaId: outraTurma,
        data: "2026-08-05",
      })
    ).rejects.toThrow();
  });

  it("quem tem turmas:manage_inscricoes cria encontro em qualquer turma", async () => {
    const t = convexTest(schema, modules);
    const turmaId = await seedTurma(t);
    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:manage_inscricoes"],
    });
    const encontroId = await as(t, gestor).mutation(
      api.turmas.mutations.createEncontro,
      { turmaId, data: "2026-08-05" }
    );
    expect(encontroId).toBeDefined();
  });

  it("removeEncontro: membro comum sem vinculo recusa", async () => {
    const t = convexTest(schema, modules);
    const turmaId = await seedTurma(t);
    const encontroId = await t.run(async (ctx) =>
      await ctx.db.insert("turmaEncontros", {
        turmaId,
        data: "2026-08-05",
        criadoEm: 1,
      })
    );
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.mutations.removeEncontro, { id: encontroId })
    ).rejects.toThrow();
    expect(await t.run(async (ctx) => await ctx.db.get(encontroId))).not.toBeNull();
  });
});

// Leitura: getById/listEncontros/getPresencas checavam apenas login e
// devolviam nome de inscritos a qualquer membro logado. Gate
// agora e "turmas:read OU instrutor da propria turma" (o instrutor faz a
// chamada pelo widget e pode nao ter a permissao).
describe("turmas.queries — leitura exige turmas:read ou ser instrutor", () => {
  it("getById: membro comum recebe null; instrutor da propria turma recebe a turma", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    const membroId = await t.run(async (ctx) => {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      return m!._id;
    });
    const minha = await seedTurma(t, membroId);
    const alheia = await seedTurma(t);

    const comum = await seedUser(t, { role: "membro" });
    expect(await as(t, comum).query(api.turmas.queries.getById, { id: minha })).toBeNull();

    expect(
      await as(t, userId).query(api.turmas.queries.getById, { id: minha })
    ).not.toBeNull();
    expect(
      await as(t, userId).query(api.turmas.queries.getById, { id: alheia })
    ).toBeNull();
  });

  it("listTurmas: membro comum recebe []; com turmas:read recebe as turmas", async () => {
    const t = convexTest(schema, modules);
    await seedTurma(t);
    const comum = await seedUser(t, { role: "membro" });
    expect(await as(t, comum).query(api.turmas.queries.listTurmas, {})).toEqual([]);

    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:read"],
    });
    const r = await as(t, gestor).query(api.turmas.queries.listTurmas, {});
    expect(r.length).toBe(1);
  });

  it("listTurmas: filtro por status usa o indice e nao vaza outros status", async () => {
    const t = convexTest(schema, modules);
    const aberta = await seedTurma(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("turmas", {
        ...turmaBase,
        nome: "Encerrada",
        vagasOcupadas: 0,
        status: "ENCERRADA",
        criadoEm: 2,
      });
    });
    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:read"],
    });
    const r = await as(t, gestor).query(api.turmas.queries.listTurmas, {
      status: "ABERTA",
    });
    expect(r.map((x) => x._id)).toEqual([aberta]);
  });

  it("listEncontros e getPresencas: membro comum nao ve nomes de inscritos", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    const membroId = await t.run(async (ctx) => {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      return m!._id;
    });
    const turmaId = await seedTurma(t, membroId);
    const { encontroId } = await t.run(async (ctx) => {
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: "Inscrito" },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: 1,
      });
      const encontroId = await ctx.db.insert("turmaEncontros", {
        turmaId,
        data: "2026-08-05",
        criadoEm: 1,
      });
      return { encontroId };
    });

    const comum = await seedUser(t, { role: "membro" });
    expect(
      await as(t, comum).query(api.turmas.queries.listEncontros, { turmaId })
    ).toEqual([]);
    expect(
      await as(t, comum).query(api.turmas.queries.getPresencas, { encontroId })
    ).toEqual([]);
    // Instrutor da propria turma continua vendo (widget de chamada)
    expect(
      (await as(t, userId).query(api.turmas.queries.getPresencas, { encontroId })).length
    ).toBe(1);
  });
});

describe("turmas.salvarPresencas — registro da chamada", () => {
  it("marca presencaRegistradaEm e nao duplica ao salvar de novo", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:manage_inscricoes"],
    });
    const turmaId = await seedTurma(t);
    const { encontroId, inscricaoId } = await t.run(async (ctx) => {
      const inscricaoId = await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: "Inscrito" },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: 1,
      });
      const encontroId = await ctx.db.insert("turmaEncontros", {
        turmaId,
        data: "2026-08-05",
        criadoEm: 1,
      });
      return { encontroId, inscricaoId };
    });

    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId,
      presencas: [{ inscricaoId, presente: true }],
    });
    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId,
      presencas: [{ inscricaoId, presente: false }],
    });

    const { encontro, presencas } = await t.run(async (ctx) => ({
      encontro: await ctx.db.get(encontroId),
      presencas: await ctx.db.query("turmaPresencas").collect(),
    }));
    expect(encontro?.presencaRegistradaEm).toBeGreaterThan(0);
    expect(presencas.length).toBe(1); // atualizou, nao inseriu de novo
    expect(presencas[0].presente).toBe(false);
  });
});

describe("turmas.queries.listInscricoes — PII dos inscritos", () => {
  it("sem turmas:read degrada para [] (nao vaza whatsapp/email)", async () => {
    const t = convexTest(schema, modules);
    const turmaId = await seedTurma(t);
    await t.run(async (ctx) =>
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: "Inscrito", whatsapp: "+5511999999999" },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: 1,
      })
    );

    const comum = await seedUser(t, { role: "membro" });
    const r = await as(t, comum).query(api.turmas.queries.listInscricoes, { turmaId });
    expect(r).toEqual([]);
  });

  it("com turmas:read retorna os inscritos (sem regressao)", async () => {
    const t = convexTest(schema, modules);
    const turmaId = await seedTurma(t);
    await t.run(async (ctx) =>
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: "Inscrito" },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: 1,
      })
    );
    const gestor = await seedUser(t, {
      role: "secretaria",
      permissions: ["turmas:read"],
    });
    const r = await as(t, gestor).query(api.turmas.queries.listInscricoes, { turmaId });
    expect(r.length).toBe(1);
  });
});
