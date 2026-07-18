import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";
import {
  idadeNaData,
  numDiarias,
  classeIdade,
  ajustarSufixo03,
  calcularValorInscricao,
  valorFinal,
  saldoInscricao,
  saldoFundo,
  type PrecosRetiro,
} from "../calculoHelpers";

// Tabela de exemplo (centavos). Quarto cobrado pelo valor cheio; extras (quem
// excede a capacidade) pagam refeicoes: <6 isento, 6-10 meia, 11+ inteira.
const PRECOS: PrecosRetiro = {
  quartos: { individual: 200_000, duplo: 300_000, triplo: 360_000, quadruplo: 400_000 },
  refeicaoInteira: 10_000,
  refeicaoMeia: 5_000,
  numRefeicoes: 6,
  idadeMeiaMin: 6,
  idadeInteiraMin: 11,
  camaExtra: 8_000,
  petPorDia: 10_000,
  palestra: 5_000,
};

const QZERO = { individual: 0, duplo: 0, triplo: 0, quadruplo: 0 };

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

  it("classeIdade: isento < meiaMin <= meia < inteiraMin <= inteiro", () => {
    expect(classeIdade(3, PRECOS)).toBe("isento"); // < 6
    expect(classeIdade(6, PRECOS)).toBe("meia");
    expect(classeIdade(10, PRECOS)).toBe("meia");
    expect(classeIdade(11, PRECOS)).toBe("inteiro");
    expect(classeIdade(40, PRECOS)).toBe("inteiro");
  });

  it("ajustarSufixo03 arredonda p/ cima ate terminar em ,03 (zero fica zero)", () => {
    expect(ajustarSufixo03(0)).toBe(0);
    expect(ajustarSufixo03(400_000)).toBe(400_003); // resto 0 -> +3
    expect(ajustarSufixo03(350_002)).toBe(350_003); // resto 2 -> +1
    expect(ajustarSufixo03(350_003)).toBe(350_003); // ja termina em 03
    expect(ajustarSufixo03(433_720)).toBe(433_803); // resto 20 -> sobe 1 real + 03
  });

  it("familia de 4 num triplo: 3 nas vagas, crianca 8 paga so refeicoes (meia)", () => {
    const r = calcularValorInscricao(
      [
        { nome: "Pai", dataNascimento: "1985-01-01", participaPalestras: true }, // inteiro
        { nome: "Mae", dataNascimento: "1987-01-01", participaPalestras: true }, // inteiro
        { nome: "Filho", dataNascimento: "2016-01-01", participaPalestras: false }, // 10 -> meia
        { nome: "Noah", dataNascimento: "2018-01-01", participaPalestras: false }, // 8 -> meia
      ],
      { quartos: { ...QZERO, triplo: 1 }, camasExtras: 0, pets: 0 },
      PRECOS,
      "2026-09-05",
      "2026-09-08",
    );
    // Capacidade 3. Vagas p/ os 2 adultos (inteiros = maior custo) + 1 das
    // criancas (meia); a outra crianca (meia) fica de fora pagando refeicoes.
    expect(r.quartos).toBe(360_000);
    expect(r.capacidade).toBe(3);
    // 1 crianca de fora: meia = 5000 * 6 = 30000 (pago ao hotel, nao cobrado)
    expect(r.refeicoesExtras).toBe(30_000);
    expect(r.palestras).toBe(10_000); // 2 adultos
    // COBRADO: quartos 360000 + palestras 10000 = 370000 -> sufixo 370003
    expect(r.subtotal).toBe(370_000);
    expect(r.total).toBe(370_003);
    // Estimativa hotel: so as refeicoes extras (sem cama/pet aqui)
    expect(r.estimativaHotel).toBe(30_000);
    expect(r.participantes.filter((p) => p.refeicoes > 0)).toHaveLength(1);
  });

  it("todos cabem nas vagas: cobra quartos + palestras; cama/pet viram estimativa hotel", () => {
    const r = calcularValorInscricao(
      [
        { nome: "A", dataNascimento: "1990-01-01", participaPalestras: true },
        { nome: "B", dataNascimento: "1992-01-01", participaPalestras: true },
      ],
      { quartos: { ...QZERO, duplo: 1 }, camasExtras: 1, pets: 1 },
      PRECOS,
      "2026-09-05",
      "2026-09-08", // 3 diarias
    );
    expect(r.refeicoesExtras).toBe(0);
    expect(r.camasExtras).toBe(8_000);
    expect(r.pets).toBe(30_000); // 10000/dia * 3 diarias
    // COBRADO: 300000 quarto + 10000 palestras = 310000 -> sufixo 310003
    expect(r.subtotal).toBe(310_000);
    expect(r.total).toBe(310_003);
    // Estimativa hotel: cama 8000 + pet 30000 = 38000 (refeicoes 0)
    expect(r.estimativaHotel).toBe(38_000);
  });

  it("valorFinal aplica descontos (nunca negativo) e ignora contribuicoes", () => {
    expect(valorFinal(100_000, [{ tipo: "DESCONTO", valor: 30_000 }])).toBe(70_000);
    expect(valorFinal(100_000, [{ tipo: "CONTRIBUICAO_FUNDO", valor: 30_000 }])).toBe(100_000);
    expect(valorFinal(100_000, [{ tipo: "DESCONTO", valor: 150_000 }])).toBe(0);
  });

  it("saldoInscricao e saldoFundo fecham a aritmetica do fluxo solidario", () => {
    expect(
      saldoInscricao(100_000, [], [{ valor: 100_000 }, { valor: 20_000 }]),
    ).toBe(-20_000);
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
      papeis: [],
      status: "ATIVO",
      nomeCompleto: "Admin",
    });
    await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
  });
  return t.withIdentity({ subject: `${userId}|s` });
}

const ARGS_ACAMP = {
  slug: "retiro-2027",
  titulo: "Retiro 2027",
  ativa: true,
  dataInicio: "2026-09-05",
  dataFim: "2026-09-08",
  precos: PRECOS,
  estoque: { individual: 0, duplo: 2, triplo: 1, quadruplo: 0 },
};

// 1 adulto num quarto duplo: 300000 quarto + 5000 palestra = 305000 -> 305003
const VALOR_1ADULTO_DUPLO = 305_003;

function argsInscricao(whatsapp: string, extra: Record<string, unknown> = {}) {
  return {
    slug: "retiro-2027",
    responsavel: { nome: "Resp Teste", whatsapp },
    participantes: [
      { nome: "Adulto", dataNascimento: "1990-01-01", participaPalestras: true },
    ],
    hospedagem: { quartos: { ...QZERO, duplo: 1 }, camasExtras: 0, pets: 0 },
    pagamentoPreferido: { forma: "A_VISTA" as const, cpfPagante: "11144477735" },
    lgpdConsentimento: true,
    ipHash: "hash-teste",
    ...extra,
  };
}

describe("retiro (integracao)", () => {
  it("criar exige permissao e valida precos", async () => {
    const t = convexTest(schema, modules);
    // @ts-ignore Convex TS2589
    await expect(t.mutation(api.retiro.mutations.criar, ARGS_ACAMP)).rejects.toThrow();

    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    expect(id).toBeTruthy();

    // idadeInteiraMin < idadeMeiaMin -> rejeita
    await expect(
      admin.mutation(api.retiro.mutations.criar, {
        ...ARGS_ACAMP,
        slug: "outro",
        precos: { ...PRECOS, idadeMeiaMin: 11, idadeInteiraMin: 6 },
      }),
    ).rejects.toThrow(/idade/i);
  });

  it("responder calcula valor com snapshot e reserva estoque", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    const r = await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));
    expect(r.status).toBe("ATIVA");
    expect(r.valorTabela).toBe(VALOR_1ADULTO_DUPLO);

    const pub = await t.query(api.public.retiro.getBySlug, { slug: "retiro-2027" });
    expect(pub!.disponibilidade.duplo).toBe(1);
  });

  it("estoque esgotado vira LISTA_ESPERA sem reservar", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, {
      ...ARGS_ACAMP,
      estoque: { individual: 0, duplo: 1, triplo: 1, quadruplo: 0 },
    });

    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));
    const r2 = await t.mutation(api.public.retiro.responder, argsInscricao("11911110002"));
    expect(r2.status).toBe("LISTA_ESPERA");

    const pub = await t.query(api.public.retiro.getBySlug, { slug: "retiro-2027" });
    expect(pub!.disponibilidade.duplo).toBe(0);
  });

  it("dedupe por whatsapp do responsavel (normalizado)", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    await t.mutation(api.public.retiro.responder, argsInscricao("+55 11 91111-0001"));
    await expect(
      t.mutation(api.public.retiro.responder, argsInscricao("11911110001")),
    ).rejects.toThrow(/Já existe/);
  });

  it("rejeita nascimento invalido/futuro e hospedagem zerada", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    await expect(
      t.mutation(
        api.public.retiro.responder,
        argsInscricao("11911110003", {
          participantes: [{ nome: "X", dataNascimento: "2030-01-01", participaPalestras: false }],
        }),
      ),
    ).rejects.toThrow(/nascimento/);

    await expect(
      t.mutation(
        api.public.retiro.responder,
        argsInscricao("11911110004", {
          hospedagem: { quartos: { ...QZERO }, camasExtras: 0, pets: 0 },
        }),
      ),
    ).rejects.toThrow(/quarto/);
  });

  it("aportarFundo soma no fundo e resumoFinanceiro fecha os numeros", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    await t.mutation(api.public.retiro.responder, argsInscricao("11911110005"));
    await admin.mutation(api.retiro.mutations.aportarFundo, {
      id,
      valor: 50_000,
      descricao: "Verba da igreja",
    });

    const resumo = await admin.query(api.retiro.queries.resumoFinanceiro, { id });
    expect(resumo!.totalTabela).toBe(VALOR_1ADULTO_DUPLO);
    expect(resumo!.totalRecebido).toBe(0);
    expect(resumo!.aReceber).toBe(VALOR_1ADULTO_DUPLO);
    expect(resumo!.fundo).toBe(50_000);
    expect(resumo!.inscricoes.ativas).toBe(1);
  });
});

describe("retiro admin (fase 3)", () => {
  it("cancelar devolve quartos; promover reserva mesmo estourando", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, {
      ...ARGS_ACAMP,
      estoque: { individual: 0, duplo: 1, triplo: 1, quadruplo: 0 },
    });

    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));
    const r2 = await t.mutation(api.public.retiro.responder, argsInscricao("11911110002"));
    expect(r2.status).toBe("LISTA_ESPERA");

    const acampId = (await admin.query(api.retiro.queries.listar, {}))[0]._id;
    const inscricoes = await admin.query(api.retiro.queries.listarInscricoes, {
      retiroId: acampId,
    });
    const ativa = inscricoes.find((i) => i.status === "ATIVA")!;
    const espera = inscricoes.find((i) => i.status === "LISTA_ESPERA")!;

    await admin.mutation(api.retiro.mutations.cancelarInscricao, {
      id: ativa._id,
      observacao: "Desistiu",
    });
    let pub = await t.query(api.public.retiro.getBySlug, { slug: "retiro-2027" });
    expect(pub!.disponibilidade.duplo).toBe(1);

    await admin.mutation(api.retiro.mutations.promoverListaEspera, { id: espera._id });
    pub = await t.query(api.public.retiro.getBySlug, { slug: "retiro-2027" });
    expect(pub!.disponibilidade.duplo).toBe(0);
    const depois = await admin.query(api.retiro.queries.getInscricao, { id: espera._id });
    expect(depois!.status).toBe("ATIVA");
  });

  it("editarInscricao recalcula com o snapshot e ajusta estoque pelo delta", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));

    const acampId = (await admin.query(api.retiro.queries.listar, {}))[0]._id;
    const insc = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: acampId })
    )[0];

    // Adiciona crianca de 8 e um 2o quarto duplo (4 vagas, 2 pessoas: sem extras)
    const r = await admin.mutation(api.retiro.mutations.editarInscricao, {
      id: insc._id,
      participantes: [
        { nome: "Adulto", dataNascimento: "1990-01-01", participaPalestras: true },
        { nome: "Crianca", dataNascimento: "2018-01-01", participaPalestras: false },
      ],
      hospedagem: { quartos: { ...QZERO, duplo: 2 }, camasExtras: 0, pets: 0 },
    });
    // 2 quartos (600000) + 1 palestra (5000) = 605000 -> 605003
    expect(r.valorTabela).toBe(605_003);

    const pub = await t.query(api.public.retiro.getBySlug, { slug: "retiro-2027" });
    expect(pub!.disponibilidade.duplo).toBe(0); // estoque 2, reservados 2
  });

  it("confirmarMatching vincula participante a membro e mostra o nome", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));

    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Adulto da Silva",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });

    const acampId = (await admin.query(api.retiro.queries.listar, {}))[0]._id;
    const insc = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: acampId })
    )[0];
    expect(insc.semMatching).toBe(1);

    await admin.mutation(api.retiro.mutations.confirmarMatching, {
      inscricaoId: insc._id,
      participanteIndex: 0,
      membroId,
    });

    const detalhe = await admin.query(api.retiro.queries.getInscricao, { id: insc._id });
    expect(detalhe!.participantes[0].membroNome).toBe("Adulto da Silva");
  });

  it("responder exige CPF do pagante valido", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    await expect(
      t.mutation(api.public.retiro.responder, {
        ...argsInscricao("11911110001"),
        pagamentoPreferido: { forma: "A_VISTA" as const },
      }),
    ).rejects.toThrow(/CPF/);

    await expect(
      t.mutation(api.public.retiro.responder, {
        ...argsInscricao("11911110002"),
        pagamentoPreferido: { forma: "A_VISTA" as const, cpfPagante: "11111111111" },
      }),
    ).rejects.toThrow(/CPF/);

    const r = await t.mutation(
      api.public.retiro.responder,
      argsInscricao("11911110003"),
    );
    expect(r.status).toBe("ATIVA");
  });

  it("comprovante: envio publico anexa 'a conferir' e secretaria descarta", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.retiro.responder, {
      ...argsInscricao("11911110009"),
      comprovanteToken: "tok-abc",
    });

    const info = await t.query(api.public.retiro.getComprovanteInfo, { token: "tok-abc" });
    expect(info!.responsavelNome).toBe("Resp Teste");
    expect(info!.valorFinal).toBe(VALOR_1ADULTO_DUPLO);
    expect(info!.enviados).toBe(0);

    expect(
      await t.query(api.public.retiro.getComprovanteInfo, { token: "nao-existe" }),
    ).toBeNull();

    await expect(
      t.mutation(api.public.retiro.enviarComprovante, {
        token: "tok-abc",
        comprovanteUrl: "https://evil.com/x.jpg",
      }),
    ).rejects.toThrow();

    await t.mutation(api.public.retiro.enviarComprovante, {
      token: "tok-abc",
      comprovanteUrl: "https://cdn.yhc.com.br/retiro-comprovantes/x.jpg",
      valorInformado: VALOR_1ADULTO_DUPLO,
      obs: "pix",
    });

    const acampId = (await admin.query(api.retiro.queries.listar, {}))[0]._id;
    const linha = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: acampId })
    )[0];
    expect(linha.comprovantesAConferir).toBe(1);

    const detalhe = await admin.query(api.retiro.queries.getInscricao, { id: linha._id });
    expect(detalhe!.comprovantesPendentes).toHaveLength(1);
    expect(detalhe!.comprovantesPendentes![0].valorInformado).toBe(VALOR_1ADULTO_DUPLO);

    await admin.mutation(api.retiro.mutations.removerComprovantePendente, {
      id: linha._id,
      index: 0,
    });
    const depois = await admin.query(api.retiro.queries.getInscricao, { id: linha._id });
    expect(depois!.comprovantesPendentes ?? []).toHaveLength(0);
  });

  it("membro logado auto-vincula a propria familia e ignora membroId forjado", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Joao Membro",
        dataNascimento: "1990-01-01",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });
    const foreignMembroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Estranho",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });
    const asMembro = t.withIdentity({ subject: `${userId}|s` });

    const fam = await asMembro.query(api.public.retiro.minhaFamilia, {});
    expect(fam!.participantes[0].membroId).toBe(membroId);

    await asMembro.mutation(api.public.retiro.responder, {
      slug: "retiro-2027",
      responsavel: { nome: "Joao Membro", whatsapp: "11999990000" },
      participantes: [
        { nome: "Joao Membro", dataNascimento: "1990-01-01", participaPalestras: true, membroId },
        {
          nome: "Estranho",
          dataNascimento: "1995-01-01",
          participaPalestras: true,
          membroId: foreignMembroId,
        },
      ],
      hospedagem: { quartos: { ...QZERO, duplo: 1 }, camasExtras: 0, pets: 0 },
      pagamentoPreferido: { forma: "A_VISTA", cpfPagante: "11144477735" },
      lgpdConsentimento: true,
      ipHash: "hash-teste",
    });

    const acampId = (await admin.query(api.retiro.queries.listar, {}))[0]._id;
    const insc = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: acampId })
    )[0];
    const detalhe = await admin.query(api.retiro.queries.getInscricao, { id: insc._id });
    expect(detalhe!.participantes[0].membroId).toBe(membroId);
    expect(detalhe!.participantes[0].membroNome).toBe("Joao Membro");
    expect(detalhe!.participantes[1].membroId).toBeUndefined();
  });

  it("minhasInscricoes lista as inscricoes do membro logado com o token", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Joao Membro",
        dataNascimento: "1990-01-01",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });
    const asMembro = t.withIdentity({ subject: `${userId}|s` });

    expect(await t.query(api.public.retiro.minhasInscricoes, {})).toEqual([]);

    await asMembro.mutation(api.public.retiro.responder, {
      ...argsInscricao("11999990000"),
      comprovanteToken: "meu-tok",
    });

    const lista = await asMembro.query(api.public.retiro.minhasInscricoes, {});
    expect(lista).toHaveLength(1);
    expect(lista[0].comprovanteToken).toBe("meu-tok");
    expect(lista[0].valorFinal).toBe(VALOR_1ADULTO_DUPLO);

    await admin.mutation(api.retiro.mutations.cancelarInscricao, { id: lista[0]._id });
    expect(await asMembro.query(api.public.retiro.minhasInscricoes, {})).toHaveLength(0);
  });
});

describe("retiro financeiro (fase 4)", () => {
  it("recebimento + sobra ao fundo + desconto fecham no resumo", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);

    // A: deve 305003, paga 320003 -> sobra 15000 destinada ao fundo
    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));
    // B: deve 305003, ganha 30000 de desconto do fundo
    await t.mutation(api.public.retiro.responder, argsInscricao("11911110002"));

    const inscricoes = await admin.query(api.retiro.queries.listarInscricoes, {
      retiroId: id,
    });
    const [a, b] = inscricoes;

    await admin.mutation(api.retiro.mutations.registrarRecebimento, {
      id: a._id,
      valor: 320_003,
      data: "2026-07-05",
      obs: "Pix",
    });
    const sobra = await admin.mutation(api.retiro.mutations.destinarSobraAoFundo, {
      id: a._id,
    });
    expect(sobra.valor).toBe(15_000);

    await admin.mutation(api.retiro.mutations.concederDesconto, {
      id: b._id,
      valor: 30_000,
      motivo: "Fundo solidário",
    });

    const resumo = await admin.query(api.retiro.queries.resumoFinanceiro, { id });
    expect(resumo!.fundo).toBe(-15_000); // 15k contribuicao - 30k desconto
    expect(resumo!.totalDescontos).toBe(30_000);
    expect(resumo!.totalRecebido).toBe(320_003);
    // A quitada (sobra destinada); B deve 305003 - 30000 = 275003
    expect(resumo!.aReceber).toBe(275_003);

    await admin.mutation(api.retiro.mutations.aportarFundo, {
      id,
      valor: 50_000,
      descricao: "Verba missões",
    });
    const resumo2 = await admin.query(api.retiro.queries.resumoFinanceiro, { id });
    expect(resumo2!.fundo).toBe(35_000);
  });

  it("destinarSobra sem sobra falha; remover recebimento/ajuste desfaz", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));
    const insc = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: id })
    )[0];

    await expect(
      admin.mutation(api.retiro.mutations.destinarSobraAoFundo, { id: insc._id }),
    ).rejects.toThrow(/sobra/i);

    await admin.mutation(api.retiro.mutations.registrarRecebimento, {
      id: insc._id,
      valor: 40_000,
      data: "2026-07-05",
    });
    await admin.mutation(api.retiro.mutations.concederDesconto, {
      id: insc._id,
      valor: 10_000,
      motivo: "Teste",
    });
    let det = await admin.query(api.retiro.queries.getInscricao, { id: insc._id });
    expect(det!.saldo).toBe(255_003); // 305003 - 10000 - 40000

    await admin.mutation(api.retiro.mutations.removerRecebimento, { id: insc._id, index: 0 });
    await admin.mutation(api.retiro.mutations.removerAjuste, { id: insc._id, index: 0 });
    det = await admin.query(api.retiro.queries.getInscricao, { id: insc._id });
    expect(det!.saldo).toBe(VALOR_1ADULTO_DUPLO);
  });

  it("plano de pagamento editavel valida datas/valores", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.retiro.responder, argsInscricao("11911110001"));
    const insc = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: id })
    )[0];

    await admin.mutation(api.retiro.mutations.editarPlanoPagamento, {
      id: insc._id,
      plano: [
        { data: "2027-01-05", valor: 42_500 },
        { data: "2027-02-05", valor: 42_500 },
      ],
    });
    const det = await admin.query(api.retiro.queries.getInscricao, { id: insc._id });
    expect(det!.planoPagamento).toHaveLength(2);

    await expect(
      admin.mutation(api.retiro.mutations.editarPlanoPagamento, {
        id: insc._id,
        plano: [{ data: "05/01/2027", valor: 100 }],
      }),
    ).rejects.toThrow(/inválido/);
  });
});

describe("retiro quartos (fase 5)", () => {
  it("gerarQuartosDoPedido cria e aloca; idempotente por inscricao", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(
      api.public.retiro.responder,
      argsInscricao("11911110001", {
        participantes: [
          { nome: "Pai", dataNascimento: "1985-01-01", participaPalestras: true },
          { nome: "Mae", dataNascimento: "1987-01-01", participaPalestras: true },
          { nome: "Filho", dataNascimento: "2018-01-01", participaPalestras: false },
        ],
        hospedagem: { quartos: { ...QZERO, duplo: 1 }, camasExtras: 1, pets: 0 },
      }),
    );

    const r1 = await admin.mutation(api.retiro.quartos.gerarQuartosDoPedido, {
      retiroId: id,
    });
    expect(r1.criados).toBe(1);
    const r2 = await admin.mutation(api.retiro.quartos.gerarQuartosDoPedido, {
      retiroId: id,
    });
    expect(r2.criados).toBe(0);

    const board = await admin.query(api.retiro.quartos.listarQuartos, { retiroId: id });
    expect(board.quartos).toHaveLength(1);
    // duplo + cama extra = 3 alocados, ninguem de fora
    expect(board.quartos[0].ocupantes).toHaveLength(3);
    expect(board.semQuarto).toHaveLength(0);
  });

  it("moverOcupante respeita capacidade e desaloca com quartoId=null", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.retiro.mutations.criar, ARGS_ACAMP);
    await t.mutation(
      api.public.retiro.responder,
      argsInscricao("11911110001", {
        participantes: [
          { nome: "A", dataNascimento: "1990-01-01", participaPalestras: false },
          { nome: "B", dataNascimento: "1990-01-01", participaPalestras: false },
          { nome: "C", dataNascimento: "1990-01-01", participaPalestras: false },
          { nome: "D", dataNascimento: "1990-01-01", participaPalestras: false },
        ],
        hospedagem: { quartos: { ...QZERO, duplo: 1 }, camasExtras: 0, pets: 0 },
      }),
    );
    const inscId = (
      await admin.query(api.retiro.queries.listarInscricoes, { retiroId: id })
    )[0]._id;
    const quartoId = await admin.mutation(api.retiro.quartos.criarQuarto, {
      retiroId: id,
      tipo: "DUPLO",
    });

    // 3 cabem (2 + 1 cama extra); o 4o estoura
    for (const idx of [0, 1, 2]) {
      await admin.mutation(api.retiro.quartos.moverOcupante, {
        retiroId: id,
        inscricaoId: inscId,
        participanteIndex: idx,
        quartoId,
      });
    }
    await expect(
      admin.mutation(api.retiro.quartos.moverOcupante, {
        retiroId: id,
        inscricaoId: inscId,
        participanteIndex: 3,
        quartoId,
      }),
    ).rejects.toThrow(/cheio/);

    await admin.mutation(api.retiro.quartos.moverOcupante, {
      retiroId: id,
      inscricaoId: inscId,
      participanteIndex: 0,
      quartoId: null,
    });
    const board = await admin.query(api.retiro.quartos.listarQuartos, { retiroId: id });
    expect(board.quartos[0].ocupantes).toHaveLength(2);
    expect(board.semQuarto.map((p) => p.nome)).toContain("A");
  });
});
