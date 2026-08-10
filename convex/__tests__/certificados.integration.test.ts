import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";
import { PASTOR_TITULAR } from "../turmas/lib/constants";

// Certificado = snapshot do que foi impresso. Um ativo por inscricao; corrigir
// e revogar e emitir novo. Frequencia abaixo do minimo NAO bloqueia (o minimo e
// semaforo), mas frequencia nao apurada bloqueia.

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

/** Turma com curso (4 aulas, 80%), 1 aluno e chamada feita em `presencas`. */
async function seedTurmaComChamada(t: Teste, presencas: boolean[]) {
  const gestor = await seedGestor(t);
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const cursoId = await as(t, gestor).mutation(api.cursos.mutations.create, {
    nome: "Curso de Novos Membros",
    cargaHoraria: 12,
    totalAulas: presencas.length,
    frequenciaMinima: 80,
  });
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turmaId = await as(t, gestor).mutation(api.turmas.mutations.create, {
    nome: "Novos Membros 2/2026",
    dataInicio: "2026-08-03",
    diaSemana: "SEGUNDA",
    camposSistema: ["nomeCompleto"],
    cursoId,
  });

  const inscricaoId = await t.run(async (ctx) =>
    await ctx.db.insert("inscricoes", {
      turmaId,
      dadosSistema: { nomeCompleto: "maria  de souza" },
      status: "CONFIRMADA",
      lgpdConsentimento: true,
      criadoEm: new Date("2026-08-01T12:00:00Z").getTime(),
    })
  );

  const aulas = await t.run(async (ctx) =>
    await ctx.db
      .query("turmaEncontros")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect()
  );

  for (const [i, presente] of presencas.entries()) {
    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId: aulas[i]._id,
      presencas: [{ inscricaoId, presente }],
    });
  }

  return { gestor, turmaId, inscricaoId };
}

describe("certificados.painel", () => {
  it("mostra frequencia, aptidao e exige turmas:manage_inscricoes", async () => {
    const t = novoTeste();
    // 3 de 4 presencas = 75%, abaixo do minimo de 80%
    const { gestor, turmaId } = await seedTurmaComChamada(t, [true, true, true, false]);

    const painel = await as(t, gestor).query(api.turmas.certificados.painel, { turmaId });
    expect(painel?.cursoNome).toBe("Curso de Novos Membros");
    expect(painel?.cargaHoraria).toBe(12);
    expect(painel?.alunos[0].percentual).toBe(75);
    expect(painel?.alunos[0].apto).toBe(false);
    expect(painel?.alunos[0].certificado).toBeNull();

    const comum = await seedUser(t, { role: "membro" });
    expect(
      await as(t, comum).query(api.turmas.certificados.painel, { turmaId })
    ).toBeNull();
  });
});

describe("certificados.emitir", () => {
  it("grava snapshot com nome editado e nao muda depois", async () => {
    const t = novoTeste();
    const { gestor, turmaId, inscricaoId } = await seedTurmaComChamada(t, [true, true, true, true]);

    const certId = await as(t, gestor).mutation(api.turmas.certificados.emitir, {
      inscricaoId,
      nomeImpresso: "Maria de Souza",
    });

    const cert = await t.run(async (ctx) => await ctx.db.get(certId));
    expect(cert?.nomeImpresso).toBe("Maria de Souza"); // corrigido, nao "maria  de souza"
    expect(cert?.percentualFrequencia).toBe(100);
    expect(cert?.aulasPresentes).toBe(4);
    expect(cert?.aulasConsideradas).toBe(4);
    expect(cert?.cursoNome).toBe("Curso de Novos Membros");
    expect(cert?.cargaHoraria).toBe(12);
    expect(cert?.codigo).toMatch(/^[0-9A-F]{12}$/);

    // Frequencia muda depois: o snapshot permanece
    const aula = await t.run(async (ctx) => {
      const aulas = await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
        .collect();
      return aulas[0]._id;
    });
    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId: aula,
      presencas: [{ inscricaoId, presente: false }],
    });

    const depois = await t.run(async (ctx) => await ctx.db.get(certId));
    expect(depois?.percentualFrequencia).toBe(100);
  });

  it("emite abaixo do minimo (semaforo, nao trava) mas nao sem apuracao", async () => {
    const t = novoTeste();
    const { gestor, inscricaoId } = await seedTurmaComChamada(t, [true, false, false, false]);
    const certId = await as(t, gestor).mutation(api.turmas.certificados.emitir, {
      inscricaoId,
    });
    expect((await t.run(async (ctx) => await ctx.db.get(certId)))?.percentualFrequencia).toBe(25);

    // Turma sem chamada nenhuma: sem frequencia apurada
    const semChamada = await seedTurmaComChamada(t, []);
    await expect(
      as(t, semChamada.gestor).mutation(api.turmas.certificados.emitir, {
        inscricaoId: semChamada.inscricaoId,
      })
    ).rejects.toThrow(/apurada/i);
  });

  it("um ativo por inscricao: reemitir exige revogar antes", async () => {
    const t = novoTeste();
    const { gestor, inscricaoId } = await seedTurmaComChamada(t, [true, true, true, true]);
    const primeiro = await as(t, gestor).mutation(api.turmas.certificados.emitir, {
      inscricaoId,
    });

    await expect(
      as(t, gestor).mutation(api.turmas.certificados.emitir, { inscricaoId })
    ).rejects.toThrow(/ativo/i);

    await as(t, gestor).mutation(api.turmas.certificados.revogar, { id: primeiro });
    const segundo = await as(t, gestor).mutation(api.turmas.certificados.emitir, {
      inscricaoId,
      nomeImpresso: "Maria S. de Souza",
    });
    expect(segundo).not.toBe(primeiro);

    // O revogado continua no banco (rastro do que foi entregue)
    const todos = await t.run(async (ctx) =>
      await ctx.db
        .query("certificados")
        .withIndex("by_inscricao", (q) => q.eq("inscricaoId", inscricaoId))
        .collect()
    );
    expect(todos.length).toBe(2);
    expect(todos.filter((c) => !c.revogadoEm).length).toBe(1);
  });

  it("membro comum nao emite nem revoga", async () => {
    const t = novoTeste();
    const { gestor, inscricaoId } = await seedTurmaComChamada(t, [true, true, true, true]);
    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.turmas.certificados.emitir, { inscricaoId })
    ).rejects.toThrow();

    const certId = await as(t, gestor).mutation(api.turmas.certificados.emitir, {
      inscricaoId,
    });
    await expect(
      as(t, comum).mutation(api.turmas.certificados.revogar, { id: certId })
    ).rejects.toThrow();
  });
});

describe("certificados — assinaturas em snapshot", () => {
  it("grava o instrutor da turma e o pastor titular; trocar o instrutor depois nao muda o emitido", async () => {
    const t = novoTeste();
    const { gestor, turmaId, inscricaoId } = await seedTurmaComChamada(t, [true, true, true, true]);

    // Instrutor externo (texto livre) — o caso do membro vinculado usa o mesmo
    // resolvedor de nome das listagens.
    await as(t, gestor).mutation(api.turmas.mutations.update, {
      id: turmaId,
      instrutorNome: "Leandro Luiz Novaes",
    });

    const certId = await as(t, gestor).mutation(api.turmas.certificados.emitir, {
      inscricaoId,
    });
    const cert = await t.run(async (ctx) => await ctx.db.get(certId));
    expect(cert?.instrutorNome).toBe("Leandro Luiz Novaes");
    expect(cert?.pastorNome).toBe(PASTOR_TITULAR);

    await as(t, gestor).mutation(api.turmas.mutations.update, {
      id: turmaId,
      instrutorNome: "Outro Professor",
    });
    expect(
      (await t.run(async (ctx) => await ctx.db.get(certId)))?.instrutorNome
    ).toBe("Leandro Luiz Novaes");
  });
});

describe("certificados.emitirAptos e impressao", () => {
  it("emite so para os aptos sem certificado e lista para impressao", async () => {
    const t = novoTeste();
    // Aluno 1: 100% (apto com minimo 80)
    const { gestor, turmaId } = await seedTurmaComChamada(t, [true, true, true, true]);

    // Aluno 2 entra depois e falta em tudo o que teve chamada
    const inscricao2 = await t.run(async (ctx) =>
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: "Ana Ausente" },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: new Date("2026-08-01T12:00:00Z").getTime(),
      })
    );
    const aulas = await t.run(async (ctx) =>
      await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
        .collect()
    );
    await as(t, gestor).mutation(api.turmas.mutations.salvarPresencas, {
      encontroId: aulas[0]._id,
      presencas: [{ inscricaoId: inscricao2, presente: false }],
    });

    const emitidos = await as(t, gestor).mutation(api.turmas.certificados.emitirAptos, {
      turmaId,
    });
    expect(emitidos).toBe(1);

    // Rodar de novo nao duplica
    expect(
      await as(t, gestor).mutation(api.turmas.certificados.emitirAptos, { turmaId })
    ).toBe(0);

    const paraImpressao = await as(t, gestor).query(
      api.turmas.certificados.listParaImpressao,
      { turmaId }
    );
    expect(paraImpressao.length).toBe(1);
    expect(paraImpressao[0].nomeImpresso).toBe("maria  de souza");
  });
});

describe("certificados.setObservacoesInstrutor", () => {
  it("salva a nota do aluno e aparece no painel", async () => {
    const t = novoTeste();
    const { gestor, turmaId, inscricaoId } = await seedTurmaComChamada(t, [true, true, true, true]);

    await as(t, gestor).mutation(api.turmas.certificados.setObservacoesInstrutor, {
      inscricaoId,
      texto: "  Participou bem, mas faltou na ultima  ",
    });

    const painel = await as(t, gestor).query(api.turmas.certificados.painel, { turmaId });
    expect(painel?.alunos[0].observacoesInstrutor).toBe(
      "Participou bem, mas faltou na ultima"
    );
  });
});
