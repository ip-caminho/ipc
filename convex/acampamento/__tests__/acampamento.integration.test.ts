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
    pagamentoPreferido: { forma: "A_VISTA" as const, cpfPagante: "11144477735" },
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

describe("acampamento admin (fase 3)", () => {
  it("cancelar devolve quartos; promover reserva mesmo estourando", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, { ...ARGS_ACAMP, estoqueDuplos: 1 });

    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));
    const r2 = await t.mutation(api.public.acampamento.responder, argsInscricao("11911110002"));
    expect(r2.status).toBe("LISTA_ESPERA");

    const acampId = (await admin.query(api.acampamento.queries.listar, {}))[0]._id;
    const inscricoes = await admin.query(api.acampamento.queries.listarInscricoes, {
      acampamentoId: acampId,
    });
    const ativa = inscricoes.find((i) => i.status === "ATIVA")!;
    const espera = inscricoes.find((i) => i.status === "LISTA_ESPERA")!;

    // Cancela a ativa -> estoque volta (1 disponivel)
    await admin.mutation(api.acampamento.mutations.cancelarInscricao, {
      id: ativa._id,
      observacao: "Desistiu",
    });
    let pub = await t.query(api.public.acampamento.getBySlug, { slug: "acampa-2026" });
    expect(pub!.disponibilidade.duplos).toBe(1);

    // Promove a da espera -> reserva de novo (0 disponivel)
    await admin.mutation(api.acampamento.mutations.promoverListaEspera, { id: espera._id });
    pub = await t.query(api.public.acampamento.getBySlug, { slug: "acampa-2026" });
    expect(pub!.disponibilidade.duplos).toBe(0);
    const depois = await admin.query(api.acampamento.queries.getInscricao, { id: espera._id });
    expect(depois!.status).toBe("ATIVA");
  });

  it("editarInscricao recalcula com o snapshot e ajusta estoque pelo delta", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));

    const acampId = (await admin.query(api.acampamento.queries.listar, {}))[0]._id;
    const insc = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: acampId })
    )[0];

    // Adiciona crianca de 8 anos (faixa 40k) e mais um quarto
    const r = await admin.mutation(api.acampamento.mutations.editarInscricao, {
      id: insc._id,
      participantes: [
        { nome: "Adulto", dataNascimento: "1990-01-01", participaPalestras: true },
        { nome: "Crianca", dataNascimento: "2018-01-01", participaPalestras: false },
      ],
      hospedagem: { quartosDuplos: 2, quartosTriplos: 0, camasExtras: 0, pets: 0 },
    });
    expect(r.valorTabela).toBe(125_000); // 80k + 40k + 5k palestra

    const pub = await t.query(api.public.acampamento.getBySlug, { slug: "acampa-2026" });
    expect(pub!.disponibilidade.duplos).toBe(0); // estoque 2, reservados 2
  });

  it("confirmarMatching vincula participante a membro e mostra o nome", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));

    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Adulto da Silva",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });

    const acampId = (await admin.query(api.acampamento.queries.listar, {}))[0]._id;
    const insc = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: acampId })
    )[0];
    expect(insc.semMatching).toBe(1);

    await admin.mutation(api.acampamento.mutations.confirmarMatching, {
      inscricaoId: insc._id,
      participanteIndex: 0,
      membroId,
    });

    const detalhe = await admin.query(api.acampamento.queries.getInscricao, { id: insc._id });
    expect(detalhe!.participantes[0].membroNome).toBe("Adulto da Silva");
  });

  it("responder exige CPF do pagante valido", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    // Sem CPF -> rejeita
    await expect(
      t.mutation(api.public.acampamento.responder, {
        ...argsInscricao("11911110001"),
        pagamentoPreferido: { forma: "A_VISTA" as const },
      }),
    ).rejects.toThrow(/CPF/);

    // CPF invalido (digitos verificadores errados) -> rejeita
    await expect(
      t.mutation(api.public.acampamento.responder, {
        ...argsInscricao("11911110002"),
        pagamentoPreferido: { forma: "A_VISTA" as const, cpfPagante: "11111111111" },
      }),
    ).rejects.toThrow(/CPF/);

    // CPF valido -> aceita
    const r = await t.mutation(
      api.public.acampamento.responder,
      argsInscricao("11911110003"),
    );
    expect(r.status).toBe("ATIVA");
  });

  it("comprovante: envio publico anexa 'a conferir' e secretaria descarta", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.acampamento.responder, {
      ...argsInscricao("11911110009"),
      comprovanteToken: "tok-abc",
    });

    // Resumo publico pelo token
    const info = await t.query(api.public.acampamento.getComprovanteInfo, { token: "tok-abc" });
    expect(info!.responsavelNome).toBe("Resp Teste");
    expect(info!.valorFinal).toBe(85_000); // 80k adulto + 5k palestra
    expect(info!.enviados).toBe(0);

    // Token invalido -> null
    expect(
      await t.query(api.public.acampamento.getComprovanteInfo, { token: "nao-existe" }),
    ).toBeNull();

    // Envio com URL fora do CDN de comprovantes -> rejeita
    await expect(
      t.mutation(api.public.acampamento.enviarComprovante, {
        token: "tok-abc",
        comprovanteUrl: "https://evil.com/x.jpg",
      }),
    ).rejects.toThrow();

    // Envio valido -> entra em comprovantesPendentes
    await t.mutation(api.public.acampamento.enviarComprovante, {
      token: "tok-abc",
      comprovanteUrl: "https://cdn.yhc.com.br/acampamento-comprovantes/x.jpg",
      valorInformado: 85_000,
      obs: "pix",
    });

    const acampId = (await admin.query(api.acampamento.queries.listar, {}))[0]._id;
    const linha = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: acampId })
    )[0];
    expect(linha.comprovantesAConferir).toBe(1);

    const detalhe = await admin.query(api.acampamento.queries.getInscricao, { id: linha._id });
    expect(detalhe!.comprovantesPendentes).toHaveLength(1);
    expect(detalhe!.comprovantesPendentes![0].valorInformado).toBe(85_000);

    // Secretaria descarta apos conferir
    await admin.mutation(api.acampamento.mutations.removerComprovantePendente, {
      id: linha._id,
      index: 0,
    });
    const depois = await admin.query(api.acampamento.queries.getInscricao, { id: linha._id });
    expect(depois!.comprovantesPendentes ?? []).toHaveLength(0);
  });

  it("membro logado auto-vincula a propria familia e ignora membroId forjado", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    // Membro com cadastro na base (vira o usuario logado)
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Joao Membro",
        dataNascimento: "1990-01-01",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });
    // Membro de OUTRA familia — membroId que o cliente nao pode reivindicar
    const foreignMembroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Estranho",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });
    const asMembro = t.withIdentity({ subject: `${userId}|s` });

    // Pre-preenchimento traz o membroId do proprio membro
    const fam = await asMembro.query(api.public.acampamento.minhaFamilia, {});
    expect(fam!.participantes[0].membroId).toBe(membroId);

    // Participante 0: membroId da propria familia -> auto-vincula.
    // Participante 1: membroId forjado (fora da familia) -> entra sem vinculo.
    await asMembro.mutation(api.public.acampamento.responder, {
      slug: "acampa-2026",
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
      hospedagem: { quartosDuplos: 1, quartosTriplos: 0, camasExtras: 0, pets: 0 },
      pagamentoPreferido: { forma: "A_VISTA", cpfPagante: "11144477735" },
      lgpdConsentimento: true,
      ipHash: "hash-teste",
    });

    const acampId = (await admin.query(api.acampamento.queries.listar, {}))[0]._id;
    const insc = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: acampId })
    )[0];
    const detalhe = await admin.query(api.acampamento.queries.getInscricao, { id: insc._id });
    expect(detalhe!.participantes[0].membroId).toBe(membroId);
    expect(detalhe!.participantes[0].membroNome).toBe("Joao Membro");
    expect(detalhe!.participantes[1].membroId).toBeUndefined();
  });

  it("minhasInscricoes lista as inscricoes do membro logado com o token", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Joao Membro",
        dataNascimento: "1990-01-01",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });
    const asMembro = t.withIdentity({ subject: `${userId}|s` });

    // Sem login -> lista vazia
    expect(await t.query(api.public.acampamento.minhasInscricoes, {})).toEqual([]);

    await asMembro.mutation(api.public.acampamento.responder, {
      ...argsInscricao("11999990000"),
      comprovanteToken: "meu-tok",
    });

    const lista = await asMembro.query(api.public.acampamento.minhasInscricoes, {});
    expect(lista).toHaveLength(1);
    expect(lista[0].comprovanteToken).toBe("meu-tok");
    expect(lista[0].valorFinal).toBe(85_000);

    // Cancelada nao aparece mais p/ o membro
    await admin.mutation(api.acampamento.mutations.cancelarInscricao, { id: lista[0]._id });
    expect(await asMembro.query(api.public.acampamento.minhasInscricoes, {})).toHaveLength(0);
  });
});

describe("acampamento financeiro (fase 4)", () => {
  it("recebimento + sobra ao fundo + desconto fecham no resumo", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);

    // Inscricao A: deve 85k, paga 100k -> sobra 15k destinada ao fundo
    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));
    // Inscricao B: deve 85k, ganha 30k de desconto do fundo
    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110002"));

    const inscricoes = await admin.query(api.acampamento.queries.listarInscricoes, {
      acampamentoId: id,
    });
    const [a, b] = inscricoes;

    await admin.mutation(api.acampamento.mutations.registrarRecebimento, {
      id: a._id,
      valor: 100_000,
      data: "2026-07-05",
      obs: "Pix",
    });
    const sobra = await admin.mutation(api.acampamento.mutations.destinarSobraAoFundo, {
      id: a._id,
    });
    expect(sobra.valor).toBe(15_000);

    await admin.mutation(api.acampamento.mutations.concederDesconto, {
      id: b._id,
      valor: 30_000,
      motivo: "Fundo solidário",
    });

    const resumo = await admin.query(api.acampamento.queries.resumoFinanceiro, { id });
    expect(resumo!.fundo).toBe(-15_000); // 15k contribuicao - 30k desconto
    expect(resumo!.totalDescontos).toBe(30_000);
    expect(resumo!.totalRecebido).toBe(100_000);
    // A quitada (sobra ja destinada); B deve 55k
    expect(resumo!.aReceber).toBe(55_000);

    // Aporte da igreja cobre o fundo
    await admin.mutation(api.acampamento.mutations.aportarFundo, {
      id,
      valor: 50_000,
      descricao: "Verba missões",
    });
    const resumo2 = await admin.query(api.acampamento.queries.resumoFinanceiro, { id });
    expect(resumo2!.fundo).toBe(35_000);
  });

  it("destinarSobra sem sobra falha; remover recebimento/ajuste desfaz", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));
    const insc = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: id })
    )[0];

    await expect(
      admin.mutation(api.acampamento.mutations.destinarSobraAoFundo, { id: insc._id }),
    ).rejects.toThrow(/sobra/i);

    await admin.mutation(api.acampamento.mutations.registrarRecebimento, {
      id: insc._id,
      valor: 40_000,
      data: "2026-07-05",
    });
    await admin.mutation(api.acampamento.mutations.concederDesconto, {
      id: insc._id,
      valor: 10_000,
      motivo: "Teste",
    });
    let det = await admin.query(api.acampamento.queries.getInscricao, { id: insc._id });
    expect(det!.saldo).toBe(35_000); // 85k - 10k - 40k

    await admin.mutation(api.acampamento.mutations.removerRecebimento, { id: insc._id, index: 0 });
    await admin.mutation(api.acampamento.mutations.removerAjuste, { id: insc._id, index: 0 });
    det = await admin.query(api.acampamento.queries.getInscricao, { id: insc._id });
    expect(det!.saldo).toBe(85_000);
  });

  it("plano de pagamento editavel valida datas/valores", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(api.public.acampamento.responder, argsInscricao("11911110001"));
    const insc = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: id })
    )[0];

    await admin.mutation(api.acampamento.mutations.editarPlanoPagamento, {
      id: insc._id,
      plano: [
        { data: "2027-01-05", valor: 42_500 },
        { data: "2027-02-05", valor: 42_500 },
      ],
    });
    const det = await admin.query(api.acampamento.queries.getInscricao, { id: insc._id });
    expect(det!.planoPagamento).toHaveLength(2);

    await expect(
      admin.mutation(api.acampamento.mutations.editarPlanoPagamento, {
        id: insc._id,
        plano: [{ data: "05/01/2027", valor: 100 }],
      }),
    ).rejects.toThrow(/inválido/);
  });
});

describe("acampamento quartos (fase 5)", () => {
  it("gerarQuartosDoPedido cria e aloca; idempotente por inscricao", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(
      api.public.acampamento.responder,
      argsInscricao("11911110001", {
        participantes: [
          { nome: "Pai", dataNascimento: "1985-01-01", participaPalestras: true },
          { nome: "Mae", dataNascimento: "1987-01-01", participaPalestras: true },
          { nome: "Filho", dataNascimento: "2018-01-01", participaPalestras: false },
        ],
        hospedagem: { quartosDuplos: 1, quartosTriplos: 0, camasExtras: 1, pets: 0 },
      }),
    );

    const r1 = await admin.mutation(api.acampamento.quartos.gerarQuartosDoPedido, {
      acampamentoId: id,
    });
    expect(r1.criados).toBe(1);
    const r2 = await admin.mutation(api.acampamento.quartos.gerarQuartosDoPedido, {
      acampamentoId: id,
    });
    expect(r2.criados).toBe(0); // ja alocada

    const board = await admin.query(api.acampamento.quartos.listarQuartos, { acampamentoId: id });
    expect(board.quartos).toHaveLength(1);
    // duplo + cama extra = 3 alocados, ninguem de fora
    expect(board.quartos[0].ocupantes).toHaveLength(3);
    expect(board.semQuarto).toHaveLength(0);
  });

  it("moverOcupante respeita capacidade e desaloca com quartoId=null", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await admin.mutation(api.acampamento.mutations.criar, ARGS_ACAMP);
    await t.mutation(
      api.public.acampamento.responder,
      argsInscricao("11911110001", {
        participantes: [
          { nome: "A", dataNascimento: "1990-01-01", participaPalestras: false },
          { nome: "B", dataNascimento: "1990-01-01", participaPalestras: false },
          { nome: "C", dataNascimento: "1990-01-01", participaPalestras: false },
          { nome: "D", dataNascimento: "1990-01-01", participaPalestras: false },
        ],
        hospedagem: { quartosDuplos: 1, quartosTriplos: 0, camasExtras: 0, pets: 0 },
      }),
    );
    const inscId = (
      await admin.query(api.acampamento.queries.listarInscricoes, { acampamentoId: id })
    )[0]._id;
    const quartoId = await admin.mutation(api.acampamento.quartos.criarQuarto, {
      acampamentoId: id,
      tipo: "DUPLO",
    });

    // 3 cabem (2 + 1 cama extra); o 4o estoura
    for (const idx of [0, 1, 2]) {
      await admin.mutation(api.acampamento.quartos.moverOcupante, {
        acampamentoId: id,
        inscricaoId: inscId,
        participanteIndex: idx,
        quartoId,
      });
    }
    await expect(
      admin.mutation(api.acampamento.quartos.moverOcupante, {
        acampamentoId: id,
        inscricaoId: inscId,
        participanteIndex: 3,
        quartoId,
      }),
    ).rejects.toThrow(/cheio/);

    // Desaloca um -> volta pro sem-quarto
    await admin.mutation(api.acampamento.quartos.moverOcupante, {
      acampamentoId: id,
      inscricaoId: inscId,
      participanteIndex: 0,
      quartoId: null,
    });
    const board = await admin.query(api.acampamento.quartos.listarQuartos, { acampamentoId: id });
    expect(board.quartos[0].ocupantes).toHaveLength(2);
    expect(board.semQuarto.map((p) => p.nome)).toContain("A");
  });
});
