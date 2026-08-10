import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";

// Curso = catalogo; turma = oferta datada. A turma copia frequenciaMinima do
// curso na criacao (congela a regra) e ja nasce com as aulas geradas, para o
// instrutor nunca precisar criar encontro.

const cursoBase = {
  nome: "Curso de Novos Membros",
  cargaHoraria: 12,
  totalAulas: 4,
  frequenciaMinima: 80,
};

const turmaBase = {
  nome: "Novos Membros 2/2026",
  dataInicio: "2026-08-03", // segunda-feira
  diaSemana: "SEGUNDA",
  camposSistema: ["nomeCompleto"],
};

async function seedGestor(t: ReturnType<typeof convexTest>) {
  return await seedUser(t, {
    role: "secretaria",
    permissions: ["turmas:read", "turmas:create", "turmas:update", "turmas:manage_inscricoes"],
  });
}

describe("cursos.mutations — permissao e validacao", () => {
  it("membro comum nao cria curso; com turmas:create funciona", async () => {
    const t = convexTest(schema, modules);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      as(t, comum).mutation(api.cursos.mutations.create, cursoBase)
    ).rejects.toThrow();

    const gestor = await seedGestor(t);
    const id = await as(t, gestor).mutation(api.cursos.mutations.create, cursoBase);
    expect(id).toBeDefined();
  });

  it("frequencia minima padrao 75 quando nao informada, e recusa fora de 0-100", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);

    const id = await as(t, gestor).mutation(api.cursos.mutations.create, {
      nome: "Catecumenos",
    });
    const curso = await t.run(async (ctx) => await ctx.db.get(id));
    expect(curso?.frequenciaMinima).toBe(75);

    await expect(
      as(t, gestor).mutation(api.cursos.mutations.create, {
        nome: "Invalido",
        frequenciaMinima: 120,
      })
    ).rejects.toThrow();
  });

  it("list e listAtivos exigem turmas:read e escondem curso inativo", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const id = await as(t, gestor).mutation(api.cursos.mutations.create, cursoBase);

    const comum = await seedUser(t, { role: "membro" });
    expect(await as(t, comum).query(api.cursos.queries.list, {})).toEqual([]);

    expect((await as(t, gestor).query(api.cursos.queries.listAtivos, {})).length).toBe(1);
    await as(t, gestor).mutation(api.cursos.mutations.setStatus, { id, status: "INATIVO" });
    expect(await as(t, gestor).query(api.cursos.queries.listAtivos, {})).toEqual([]);
    // Continua no catalogo completo
    expect((await as(t, gestor).query(api.cursos.queries.list, {})).length).toBe(1);
  });
});

describe("turmas.create vinculada a curso", () => {
  it("copia frequenciaMinima do curso e gera as aulas", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const cursoId = await as(t, gestor).mutation(api.cursos.mutations.create, cursoBase);

    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
      ...turmaBase,
      cursoId,
    });

    const { turma, encontros } = await t.run(async (ctx) => ({
      turma: await ctx.db.get(turmaId),
      encontros: await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
        .collect(),
    }));

    expect(turma?.frequenciaMinima).toBe(80);
    expect(encontros.map((e) => e.data)).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
    ]);
    expect(encontros.map((e) => e.titulo)).toEqual([
      "Aula 1",
      "Aula 2",
      "Aula 3",
      "Aula 4",
    ]);
  });

  it("editar o curso depois NAO muda a regra da turma em andamento", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const cursoId = await as(t, gestor).mutation(api.cursos.mutations.create, cursoBase);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
      ...turmaBase,
      cursoId,
    });

    await as(t, gestor).mutation(api.cursos.mutations.update, {
      id: cursoId,
      frequenciaMinima: 50,
    });

    const turma = await t.run(async (ctx) => await ctx.db.get(turmaId));
    expect(turma?.frequenciaMinima).toBe(80);
  });

  it("turma sem curso cai na frequencia padrao e nao gera aulas", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, turmaBase);

    const { turma, encontros } = await t.run(async (ctx) => ({
      turma: await ctx.db.get(turmaId),
      encontros: await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
        .collect(),
    }));
    expect(turma?.frequenciaMinima).toBe(75);
    expect(encontros).toEqual([]);
  });
});

describe("turmas.gerarAulas", () => {
  it("gera sob demanda, recusa duplicar e exige saber quantas", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, turmaBase);

    // Sem curso e sem totalAulas: nao sabe quantas gerar
    await expect(
      as(t, gestor).mutation(api.turmas.mutations.gerarAulas, { turmaId })
    ).rejects.toThrow();

    const criadas = await as(t, gestor).mutation(api.turmas.mutations.gerarAulas, {
      turmaId,
      totalAulas: 3,
    });
    expect(criadas).toBe(3);

    // Segunda chamada nao duplica
    await expect(
      as(t, gestor).mutation(api.turmas.mutations.gerarAulas, { turmaId, totalAulas: 3 })
    ).rejects.toThrow();

    const encontros = await t.run(async (ctx) =>
      await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
        .collect()
    );
    expect(encontros.length).toBe(3);
  });

  it("membro comum nao gera aulas", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, turmaBase);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.mutations.gerarAulas, { turmaId, totalAulas: 2 })
    ).rejects.toThrow();
  });
});

describe("turmas: janela de inscricao", () => {
  it("recusa criar com encerramento antes da abertura", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    await expect(
      as(t, gestor).mutation(api.turmas.mutations.create, {
        ...turmaBase,
        inscricoesDe: "2026-08-20",
        inscricoesAte: "2026-08-10",
      })
    ).rejects.toThrow();
  });

  it("registrar recusa fora da janela e aceita dentro", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);

    // Janela no passado: encerrada
    const fechadaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
      ...turmaBase,
      inscricoesAte: "2020-01-01",
    });
    // Janela no futuro: ainda nao comecou
    const futuraId = await as(t, gestor).mutation(api.turmas.mutations.create, {
      ...turmaBase,
      inscricoesDe: "2090-01-01",
    });
    // Sem janela: aceita
    const livreId = await as(t, gestor).mutation(api.turmas.mutations.create, turmaBase);

    const tokens = await t.run(async (ctx) => ({
      fechada: (await ctx.db.get(fechadaId))!.token!,
      futura: (await ctx.db.get(futuraId))!.token!,
      livre: (await ctx.db.get(livreId))!.token!,
    }));

    const inscricao = {
      dadosSistema: { nomeCompleto: "Visitante" },
      lgpdConsentimento: true,
    };

    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      t.mutation(api.turmas.mutations.registrar, { token: tokens.fechada, ...inscricao })
    ).rejects.toThrow(/encerradas/i);

    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      t.mutation(api.turmas.mutations.registrar, { token: tokens.futura, ...inscricao })
    ).rejects.toThrow(/ainda nao comecaram/i);

    const id = await t.mutation(api.turmas.mutations.registrar, {
      token: tokens.livre,
      ...inscricao,
    });
    expect(id).toBeDefined();
  });

  it("getByToken informa se as inscricoes estao abertas e por que nao", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
      ...turmaBase,
      inscricoesAte: "2020-01-01",
    });
    const token = await t.run(async (ctx) => (await ctx.db.get(turmaId))!.token!);

    const publica = await t.query(api.turmas.queries.getByToken, { token });
    expect(publica?.inscricoesAbertas).toBe(false);
    expect(publica?.motivoFechado).toBe("ENCERRADA");
    expect(publica?.inscricoesAte).toBe("2020-01-01");
  });

  it("update valida a janela no estado final (patch de uma ponta so)", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
      ...turmaBase,
      inscricoesDe: "2026-08-10",
      inscricoesAte: "2026-08-20",
    });

    await expect(
      as(t, gestor).mutation(api.turmas.mutations.update, {
        id: turmaId,
        inscricoesAte: "2026-08-01", // antes do inscricoesDe que ja esta salvo
      })
    ).rejects.toThrow();

    await as(t, gestor).mutation(api.turmas.mutations.update, {
      id: turmaId,
      inscricoesAte: "2026-08-25",
    });
    expect(
      (await t.run(async (ctx) => await ctx.db.get(turmaId)))?.inscricoesAte
    ).toBe("2026-08-25");
  });
});

describe("turmas.setFrequenciaMinima", () => {
  it("ajusta com turmas:manage_inscricoes e valida a faixa", async () => {
    const t = convexTest(schema, modules);
    const gestor = await seedGestor(t);
    const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, turmaBase);

    await as(t, gestor).mutation(api.turmas.mutations.setFrequenciaMinima, {
      turmaId,
      frequenciaMinima: 60,
    });
    expect(
      (await t.run(async (ctx) => await ctx.db.get(turmaId)))?.frequenciaMinima
    ).toBe(60);

    await expect(
      as(t, gestor).mutation(api.turmas.mutations.setFrequenciaMinima, {
        turmaId,
        frequenciaMinima: 101,
      })
    ).rejects.toThrow();

    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.mutations.setFrequenciaMinima, {
        turmaId,
        frequenciaMinima: 10,
      })
    ).rejects.toThrow();
  });
});
