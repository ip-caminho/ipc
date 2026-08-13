import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";
import { OBSERVACAO_MAX_CHARS, JANELA_CHAMADA_MS } from "../turmas/lib/constants";

// A chamada precisa caber em "um toque por aula": tudo pre-marcado como
// presente, o instrutor desmarca so quem faltou. A janela do widget e de 7
// dias porque o prazo de 48h fazia a aula sumir antes de ele preencher.

const DIA = 24 * 60 * 60 * 1000;

// Instancia tipada com o schema: sem isso o ctx de t.run nao conhece os indices.
function novoTeste() {
  return convexTest(schema, modules);
}
type Teste = ReturnType<typeof novoTeste>;

async function seedGestor(t: Teste) {
  return await seedUser(t, {
    role: "secretaria",
    permissions: ["turmas:read", "turmas:create", "turmas:update", "turmas:manage_inscricoes"],
  });
}

async function seedTurmaComAluno(t: Teste) {
  const gestor = await seedGestor(t);
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
    nome: "Catecumenos 2026",
    dataInicio: "2026-08-03",
    camposSistema: ["nomeCompleto"],
  });
  const { inscricaoId, encontroId } = await t.run(async (ctx) => {
    const inscricaoId = await ctx.db.insert("inscricoes", {
      turmaId,
      dadosSistema: { nomeCompleto: "Aluno Um" },
      status: "CONFIRMADA",
      lgpdConsentimento: true,
      criadoEm: 1,
    });
    const encontroId = await ctx.db.insert("turmaEncontros", {
      turmaId,
      data: "2026-08-10",
      criadoEm: Date.now(),
    });
    return { inscricaoId, encontroId };
  });
  return { gestor, turmaId, inscricaoId, encontroId };
}

describe("getPresencas — pre-marcado como presente", () => {
  it("aula sem chamada vem presente=true e registrado=false", async () => {
    const t = novoTeste();
    const { gestor, encontroId } = await seedTurmaComAluno(t);

    const lista = await as(t, gestor).query(api.turmas.queries.getPresencas, { encontroId });
    expect(lista.length).toBe(1);
    expect(lista[0].presente).toBe(true);
    expect(lista[0].registrado).toBe(false);
  });

  it("depois de salvar a falta, reflete o que foi gravado", async () => {
    const t = novoTeste();
    const { gestor, encontroId, inscricaoId } = await seedTurmaComAluno(t);

    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId,
      presencas: [{ inscricaoId, presente: false }],
    });

    const lista = await as(t, gestor).query(api.turmas.queries.getPresencas, { encontroId });
    expect(lista[0].presente).toBe(false);
    expect(lista[0].registrado).toBe(true);
  });
});

describe("salvarPresencas — anotacao da aula", () => {
  it("grava a anotacao, corta em OBSERVACAO_MAX_CHARS e nao apaga ao salvar de novo", async () => {
    const t = novoTeste();
    const { gestor, encontroId, inscricaoId } = await seedTurmaComAluno(t);

    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId,
      presencas: [{ inscricaoId, presente: true }],
      observacoes: "x".repeat(OBSERVACAO_MAX_CHARS + 50),
    });

    let encontro = await t.run(async (ctx) => await ctx.db.get(encontroId));
    expect(encontro?.observacoes?.length).toBe(OBSERVACAO_MAX_CHARS);

    // Salvar de novo sem texto mantem a anotacao anterior
    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId,
      presencas: [{ inscricaoId, presente: false }],
    });
    encontro = await t.run(async (ctx) => await ctx.db.get(encontroId));
    expect(encontro?.observacoes?.length).toBe(OBSERVACAO_MAX_CHARS);
  });
});

// Calendario real pula datas (Novos Membros: 8 domingos com tres intervalos de
// 14 dias). Se o widget deduzir "hoje tem aula" pelo dia da semana, o instrutor
// abre a chamada num domingo vazio e o card CRIA a aula — que entra no
// denominador e, sob "maximo de N faltas", vira falta real.
describe("minhasTurmasInstrutor — aula fantasma", () => {
  /** Data de hoje e o nome do dia da semana no fuso da igreja. */
  function hojeSaoPaulo() {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const p = fmt.formatToParts(new Date());
    const get = (t: string) => p.find((x) => x.type === t)!.value;
    const data = `${get("year")}-${get("month")}-${get("day")}`;
    const DIAS = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
    const diaSemana = DIAS[new Date(`${data}T12:00:00Z`).getUTCDay()];
    return { data, diaSemana };
  }

  async function seedTurmaDoInstrutor(
    t: Teste,
    opts: { diaSemana?: string; datasDeAula: string[] }
  ) {
    const userId = await seedUser(t, { role: "membro" });
    await t.run(async (ctx) => {
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      const turmaId = await ctx.db.insert("turmas", {
        nome: "Turma com calendario",
        dataInicio: "2026-09-20",
        diaSemana: opts.diaSemana,
        camposSistema: ["nomeCompleto"],
        instrutorId: membro!._id,
        vagasOcupadas: 0,
        status: "EM_ANDAMENTO",
        criadoEm: 1,
      });
      for (const data of opts.datasDeAula) {
        await ctx.db.insert("turmaEncontros", {
          turmaId,
          data,
          // criadoEm antigo: fica fora da janela de 7 dias, para nao aparecer
          // como pendente e poluir a assercao.
          criadoEm: Date.now() - 60 * DIA,
        });
      }
    });
    return userId;
  }

  it("turma COM calendario nao oferece chamada em dia sem encontro", async () => {
    const t = novoTeste();
    const { diaSemana } = hojeSaoPaulo();
    // O dia da semana da turma é justamente hoje, mas o calendário pulou hoje.
    const userId = await seedTurmaDoInstrutor(t, {
      diaSemana,
      datasDeAula: ["2020-01-05", "2020-01-19"],
    });

    const r = await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {});
    expect(r).toEqual([]);
  });

  it("turma COM calendario oferece a aula de hoje, ja com encontro existente", async () => {
    const t = novoTeste();
    const { data, diaSemana } = hojeSaoPaulo();
    const userId = await seedTurmaDoInstrutor(t, {
      diaSemana,
      datasDeAula: [data, "2020-01-19"],
    });

    const r = await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {});
    expect(r.length).toBe(1);
    expect(r[0].isDiaDeAula).toBe(true);
    // encontroId preenchido = o widget nao vai criar nada
    expect(r[0].encontroId).not.toBeNull();
    expect(r[0].encontroData).toBe(data);
  });

  it("turma SEM nenhuma aula mantem o fluxo antigo (cria a aula do dia)", async () => {
    const t = novoTeste();
    const { data, diaSemana } = hojeSaoPaulo();
    const userId = await seedTurmaDoInstrutor(t, { diaSemana, datasDeAula: [] });

    const r = await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {});
    expect(r.length).toBe(1);
    expect(r[0].encontroId).toBeNull(); // sem calendario, o card cria a aula
    expect(r[0].encontroData).toBe(data);
  });

  it("turma SEM aulas e fora do dia da semana nao aparece", async () => {
    const t = novoTeste();
    const { diaSemana } = hojeSaoPaulo();
    const outroDia = diaSemana === "DOMINGO" ? "QUARTA" : "DOMINGO";
    const userId = await seedTurmaDoInstrutor(t, {
      diaSemana: outroDia,
      datasDeAula: [],
    });

    expect(
      await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {})
    ).toEqual([]);
  });
});

describe("minhasTurmasInstrutor — janela de 7 dias", () => {
  async function seedInstrutorComEncontro(t: Teste, criadoEm: number) {
    const instrutorUserId = await seedUser(t, { role: "membro" });
    await t.run(async (ctx) => {
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", instrutorUserId))
        .first();
      const turmaId = await ctx.db.insert("turmas", {
        nome: "Turma do instrutor",
        // Sem diaSemana: nao cai no caso "aula de hoje", que dependeria do dia
        // em que o teste roda.
        dataInicio: "2026-08-03",
        camposSistema: ["nomeCompleto"],
        instrutorId: membro!._id,
        vagasOcupadas: 0,
        status: "EM_ANDAMENTO",
        criadoEm: 1,
      });
      await ctx.db.insert("turmaEncontros", {
        turmaId,
        data: "2020-01-01", // data qualquer no passado, != hoje
        criadoEm,
      });
    });
    return instrutorUserId;
  }

  it("encontro de 5 dias atras ainda aparece (antes sumia em 48h)", async () => {
    const t = novoTeste();
    const userId = await seedInstrutorComEncontro(t, Date.now() - 5 * DIA);
    const r = await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {});
    expect(r.length).toBe(1);
    expect(r[0].expiraEm).toBeGreaterThan(Date.now());
  });

  it("encontro fora da janela nao aparece", async () => {
    const t = novoTeste();
    const userId = await seedInstrutorComEncontro(t, Date.now() - JANELA_CHAMADA_MS - DIA);
    const r = await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {});
    expect(r).toEqual([]);
  });

  it("chamada feita tira o encontro da lista", async () => {
    const t = novoTeste();
    const userId = await seedInstrutorComEncontro(t, Date.now() - 2 * DIA);
    await t.run(async (ctx) => {
      const encontro = await ctx.db.query("turmaEncontros").first();
      await ctx.db.patch(encontro!._id, { presencaRegistradaEm: Date.now() });
    });
    const r = await as(t, userId).query(api.turmas.queries.minhasTurmasInstrutor, {});
    expect(r).toEqual([]);
  });
});
