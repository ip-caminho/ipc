import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";
import type { PrecosRetiro } from "../calculoHelpers";

const PRECOS: PrecosRetiro = {
  quartos: { individual: 200_000, duplo: 300_000, triplo: 360_000, quadruplo: 400_000 },
  refeicaoInteira: 10_000,
  refeicaoMeia: 5_000,
  numRefeicoes: 6,
  idadeMeiaMin: 6,
  idadeInteiraMin: 11,
  camaExtra: 10_000,
  petPorDia: 10_000,
  palestra: 5_000,
};

type T = ReturnType<typeof convexTest>;

// Insere um retiro direto na base (controle fino de ativa/janelas).
async function seedRetiro(t: T, over: Record<string, unknown> = {}) {
  return t.run((ctx) =>
    ctx.db.insert("retiros", {
      slug: "retiro-x",
      titulo: "Retiro X",
      ativa: true,
      dataInicio: "2026-09-05",
      dataFim: "2026-09-08",
      precos: PRECOS,
      estoque: { individual: 5, duplo: 5, triplo: 5, quadruplo: 5 },
      reservados: { individual: 0, duplo: 0, triplo: 0, quadruplo: 0 },
      aportesFundo: [],
      criadoEm: Date.now(),
      ...over,
    }),
  );
}

function argsInscricao(
  whatsapp: string,
  participantes: Array<{
    nome: string;
    dataNascimento: string;
    participaPalestras: boolean;
    membroId?: Id<"membros">;
  }>,
  extra: Record<string, unknown> = {},
) {
  return {
    slug: "retiro-x",
    responsavel: { nome: "Resp", whatsapp },
    participantes,
    hospedagem: {
      quartos: { individual: 0, duplo: 1, triplo: 0, quadruplo: 0 },
      camasExtras: 0,
      pets: 0,
    },
    pagamentoPreferido: { forma: "A_VISTA" as const, cpfPagante: "11144477735" },
    lgpdConsentimento: true,
    ipHash: "hash",
    ...extra,
  };
}

// Cria membro logado (entidade + membros + users) e devolve os ids + contexto.
async function seedMembroLogado(
  t: T,
  entidade: Record<string, unknown>,
) {
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  const { entidadeId, membroId } = await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      ...entidade,
    });
    const mid = await ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    return { entidadeId: eid, membroId: mid };
  });
  return { userId, entidadeId, membroId, as: t.withIdentity({ subject: `${userId}|s` }) };
}

describe("listAtivos (retiros no hub)", () => {
  it("retorna só retiros com inscrições abertas, ordenados por dataInicio", async () => {
    const t = convexTest(schema, modules);
    const agora = Date.now();
    // A: ativo e aberto, começa 09-05
    await seedRetiro(t, { slug: "a", dataInicio: "2026-09-05" });
    // B: ativo e aberto, começa antes (08-01) — deve vir primeiro
    await seedRetiro(t, { slug: "b", titulo: "B", dataInicio: "2026-08-01" });
    // C: inativo — não aparece
    await seedRetiro(t, { slug: "c", titulo: "C", ativa: false });
    // D: inscrições já fecharam — não aparece
    await seedRetiro(t, { slug: "d", titulo: "D", inscricoesFecham: agora - 1000 });

    // @ts-ignore Convex TS2589 (ref de query — mesmo padrão dos outros testes)
    const lista = await t.query(api.public.retiro.listAtivos, {});
    expect(lista.map((r: { slug: string }) => r.slug)).toEqual(["b", "a"]);
  });
});

describe("write-back de cadastro no responder", () => {
  it("preenche campo vazio no cadastro e audita", async () => {
    const t = convexTest(schema, modules);
    await seedRetiro(t);
    // Entidade do membro sem whatsapp nem dataNascimento
    const { as, entidadeId, membroId } = await seedMembroLogado(t, {
      nomeCompleto: "Joao",
    });

    await as.mutation(
      api.public.retiro.responder,
      argsInscricao("11999990000", [
        { nome: "Joao", dataNascimento: "1990-01-01", participaPalestras: true, membroId },
      ]),
    );

    const ent = await t.run((ctx) => ctx.db.get(entidadeId as Id<"entidades">));
    expect(ent!.whatsapp).toBe("+5511999990000");
    expect(ent!.dataNascimento).toBe("1990-01-01");

    // Auditoria FIELD_CHANGE em entidades
    const logs = await t.run((ctx) =>
      ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("referenciaTabela"), "entidades"))
        .collect(),
    );
    const campos = logs.map((l) => l.field);
    expect(campos).toContain("whatsapp");
    expect(campos).toContain("dataNascimento");
  });

  it("não sobrescreve campo divergente; registra divergência na inscrição", async () => {
    const t = convexTest(schema, modules);
    await seedRetiro(t);
    // Entidade já tem whatsapp e nascimento — diferentes do que será enviado
    const { as, entidadeId, membroId } = await seedMembroLogado(t, {
      nomeCompleto: "Maria",
      whatsapp: "+5511888888888",
      dataNascimento: "1980-01-01",
    });

    await as.mutation(
      api.public.retiro.responder,
      argsInscricao("11999990000", [
        { nome: "Maria", dataNascimento: "1990-01-01", participaPalestras: true, membroId },
      ]),
    );

    // Cadastro permanece inalterado
    const ent = await t.run((ctx) => ctx.db.get(entidadeId as Id<"entidades">));
    expect(ent!.whatsapp).toBe("+5511888888888");
    expect(ent!.dataNascimento).toBe("1980-01-01");

    // Divergências ficam na inscrição
    const insc = await t.run((ctx) =>
      ctx.db.query("inscricoesRetiro").first(),
    );
    const campos = (insc!.divergenciasCadastro ?? []).map((d) => d.campo).sort();
    expect(campos).toEqual(["dataNascimento", "whatsapp"]);
  });

  it("participante sem membroId não altera nenhum cadastro", async () => {
    const t = convexTest(schema, modules);
    await seedRetiro(t);
    // Entidade vazia, mas o participante NÃO manda membroId
    const { as, entidadeId } = await seedMembroLogado(t, { nomeCompleto: "Ana" });

    await as.mutation(
      api.public.retiro.responder,
      argsInscricao("11999990000", [
        { nome: "Visitante", dataNascimento: "1990-01-01", participaPalestras: true },
      ]),
    );

    // O responsável (o próprio membro logado) ainda tem write-back de whatsapp —
    // mas a dataNascimento da entidade não deve ser tocada por um participante
    // não vinculado.
    const ent = await t.run((ctx) => ctx.db.get(entidadeId as Id<"entidades">));
    expect(ent!.dataNascimento).toBeUndefined();
  });

  it("sem usuário logado não faz write-back", async () => {
    const t = convexTest(schema, modules);
    await seedRetiro(t);
    // Entidade solta (não é o usuário logado — ninguém está logado)
    const entidadeId = await t.run((ctx) =>
      ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Fulano",
      }),
    );

    await t.mutation(
      api.public.retiro.responder,
      argsInscricao("11999990000", [
        { nome: "Fulano", dataNascimento: "1990-01-01", participaPalestras: true },
      ]),
    );

    const ent = await t.run((ctx) => ctx.db.get(entidadeId as Id<"entidades">));
    expect(ent!.whatsapp).toBeUndefined();
    expect(ent!.dataNascimento).toBeUndefined();
  });
});
