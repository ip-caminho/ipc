import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";
import {
  idadeNaData,
  numDiarias,
  valorParticipante,
  calcularValorInscricao,
  valorFinal,
  saldoInscricao,
  saldoFundo,
  type PrecosAcampamento,
} from "../calculoHelpers";

// Tabela de exemplo (centavos): 0-4 isento, 5-10 reduzido, 11+ inteiro
const PRECOS: PrecosAcampamento = {
  faixas: [
    { idadeMin: 0, idadeMax: 4, valor: 0 },
    { idadeMin: 5, idadeMax: 10, valor: 40_000 },
    { idadeMin: 11, idadeMax: 120, valor: 80_000 },
  ],
  camaExtra: 10_000,
  petPorDia: 10_000,
  palestra: 5_000,
};

describe("calculoHelpers", () => {
  it("idadeNaData conta anos completos (antes e depois do aniversario)", () => {
    expect(idadeNaData("1990-06-15", "2026-06-14")).toBe(35);
    expect(idadeNaData("1990-06-15", "2026-06-15")).toBe(36);
    expect(idadeNaData("2023-07-04", "2026-07-03")).toBe(2);
  });

  it("numDiarias conta noites (minimo 1)", () => {
    expect(numDiarias("2026-09-05", "2026-09-08")).toBe(3);
    expect(numDiarias("2026-09-05", "2026-09-05")).toBe(1);
  });

  it("valorParticipante usa a faixa da idade e cai na mais alta fora delas", () => {
    expect(valorParticipante(PRECOS, "2024-01-01", "2026-09-05")).toBe(0); // 2 anos
    expect(valorParticipante(PRECOS, "2018-01-01", "2026-09-05")).toBe(40_000); // 8
    expect(valorParticipante(PRECOS, "1990-01-01", "2026-09-05")).toBe(80_000); // 36
    // Fora de todas as faixas (idade > 120): cai na faixa de maior idadeMax
    const semTopo: PrecosAcampamento = {
      ...PRECOS,
      faixas: [{ idadeMin: 0, idadeMax: 17, valor: 40_000 }],
    };
    expect(valorParticipante(semTopo, "1980-01-01", "2026-09-05")).toBe(40_000);
  });

  it("calcularValorInscricao soma faixas + palestras + camas + pets x diarias", () => {
    const r = calcularValorInscricao(
      [
        { nome: "Pai", dataNascimento: "1985-01-01", participaPalestras: true },
        { nome: "Mae", dataNascimento: "1987-01-01", participaPalestras: true },
        { nome: "Filho", dataNascimento: "2019-01-01", participaPalestras: false }, // 7
        { nome: "Bebe", dataNascimento: "2024-01-01", participaPalestras: false }, // 2
      ],
      { quartosDuplos: 1, quartosTriplos: 0, camasExtras: 1, pets: 1 },
      PRECOS,
      "2026-09-05",
      "2026-09-08", // 3 diarias
    );
    // 80000+80000+40000+0 (hospedagem) + 2x5000 (palestras) + 10000 (cama) + 3x10000 (pet)
    expect(r.total).toBe(250_000);
    expect(r.palestras).toBe(10_000);
    expect(r.camasExtras).toBe(10_000);
    expect(r.pets).toBe(30_000);
  });

  it("valorFinal aplica descontos (nunca negativo) e ignora contribuicoes", () => {
    expect(valorFinal(100_000, [{ tipo: "DESCONTO", valor: 30_000 }])).toBe(70_000);
    expect(valorFinal(100_000, [{ tipo: "CONTRIBUICAO_FUNDO", valor: 30_000 }])).toBe(100_000);
    expect(valorFinal(100_000, [{ tipo: "DESCONTO", valor: 150_000 }])).toBe(0);
  });

  it("saldoInscricao e saldoFundo fecham a aritmetica do fluxo solidario", () => {
    // Deve 100k, recebeu 120k -> saldo -20k (sobra p/ destinar ao fundo)
    expect(
      saldoInscricao(100_000, [], [{ valor: 100_000 }, { valor: 20_000 }]),
    ).toBe(-20_000);
    // Fundo: 50k aporte + 20k contribuicao - 30k desconto = 40k
    expect(
      saldoFundo(
        [{ valor: 50_000 }],
        [
          { tipo: "CONTRIBUICAO_FUNDO", valor: 20_000 },
          { tipo: "DESCONTO", valor: 30_000 },
        ],
      ),
    ).toBe(40_000);
  });
});

// ===== Integracao (convex-test) =====

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

const ARGS_ACAMP = {
  slug: "acampa-2026",
  titulo: "Acampamento 2026",
  ativa: true,
  dataInicio: "2026-09-05",
  dataFim: "2026-09-08",
  precos: PRECOS,
  estoqueDuplos: 2,
  estoqueTriplos: 1,
};

function argsInscricao(whatsapp: string, extra: Record<string, unknown> = {}) {
  return {
    slug: "acampa-2026",
    responsavel: { nome: "Resp Teste", whatsapp },
    participantes: [
      { nome: "Adulto", dataNascimento: "1990-01-01", participaPalestras: true },
    ],
    hospedagem: { quartosDuplos: 1, quartosTriplos: 0, camasExtras: 0, pets: 0 },
    pagamentoPreferido: { forma: "A_VISTA" as const },
    lgpdConsentimento: true,
    ipHash: "hash-teste",
    ...extra,
  };
}

describe("acampamento (integracao)", () => {
  it("criar exige permissao e valida faixas", async () => {
    const t = convexTest(schema, modules);
    // @ts-ignore Convex TS2589
    await expect(t.mutation(api.acampamento.mutations.criar, ARGS_ACAMP)).rejects.toThrow();

    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    expect(id).toBeTruthy();

    await expect(
      admin.mutation(api.acampamento.mutations.criar, {
        ...ARGS_ACAMP,
        slug: "outro",
        precos: { ...PRECOS, faixas: [{ idadeMin: 10, idadeMax: 5, valor: 0 }] },
      }),
    ).rejects.toThrow(/idadeMin/);
  });

  it("responder calcula valor com snapshot e reserva estoque", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    const r = await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));
    expect(r.status).toBe("ATIVA");
    expect(r.valorTabela).toBe(85_000); // 80000 hospedagem + 5000 palestra

    const pub = await t.query(api.public.acampamento.getBySlug, { slug: "acampa-2026" });
    expect(pub!.disponibilidade.duplos).toBe(1);
  });

  it("estoque esgotado vira LISTA_ESPERA sem reservar", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, { ...ARGS_ACAMP, estoqueDuplos: 1 });

    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));
    const r2 = await t.mutation(api.public.acampamento.responder, argsInscricao("11911110002"));
    expect(r2.status).toBe("LISTA_ESPERA");

    const pub = await t.query(api.public.acampamento.getBySlug, { slug: "acampa-2026" });
    expect(pub!.disponibilidade.duplos).toBe(0);
  });

  it("dedupe por whatsapp do responsavel (normalizado)", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    await t.mutation(api.public.acampamento.responder, argsInscricao("+55 11 91111-0001"));
    await expect(
      t.mutation(api.public.acampamento.responder, argsInscricao("11911110001")),
    ).rejects.toThrow(/Já existe/);
  });

  it("rejeita nascimento invalido/futuro e hospedagem zerada", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    await expect(
      t.mutation(
        api.public.acampamento.responder,
        argsInscricao("11911110003", {
          participantes: [{ nome: "X", dataNascimento: "2030-01-01", participaPalestras: false }],
        }),
      ),
    ).rejects.toThrow(/nascimento/);

    await expect(
      t.mutation(
        api.public.acampamento.responder,
        argsInscricao("11911110004", {
          hospedagem: { quartosDuplos: 0, quartosTriplos: 0, camasExtras: 0, pets: 0 },
        }),
      ),
    ).rejects.toThrow(/quarto/);
  });

  it("aportarFundo soma no fundo e resumoFinanceiro fecha os numeros", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110005"));
    await admin.mutation(api.acampamento.mutations.aportarFundo, {
      id,
      valor: 50_000,
      descricao: "Verba da igreja",
    });

    const resumo = await admin.query(api.acampamento.queries.resumoFinanceiro, { id });
    expect(resumo!.totalTabela).toBe(85_000);
    expect(resumo!.totalRecebido).toBe(0);
    expect(resumo!.aReceber).toBe(85_000);
    expect(resumo!.fundo).toBe(50_000);
    expect(resumo!.inscricoes.ativas).toBe(1);
  });
});
