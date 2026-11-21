import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { MAPAS_TURMAS } from "../migration/textosAcentos";

type T = ReturnType<typeof convexTest>;

async function semear(t: T) {
  return await t.run(async (ctx) => {
    const base = { multiplo: false, temEquipe: false, temPassagem: false, views: ["escala"], ordem: 1, ativo: true };
    await ctx.db.insert("funcoes", { ...base, slug: "CONFISSAO", label: "Confissao" });
    await ctx.db.insert("funcoes", { ...base, slug: "PREGACAO", label: "Pregacao" });
    await ctx.db.insert("funcoes", { ...base, slug: "MULTIMIDIA", label: "Multimidia" });
    await ctx.db.insert("funcoes", { ...base, slug: "ABERTURA", label: "Abertura" });

    await ctx.db.insert("modulos", { slug: "diretorio", label: "Diretorio", descricao: "Diretorio de contatos", ativo: true, ordem: 2 });
    await ctx.db.insert("modulos", { slug: "membros", label: "Membros", descricao: "Cadastro e gestao de membros", ativo: true, ordem: 1 });

    await ctx.db.insert("ministerios", { nome: "Multimidia", descricao: "Ministerio de midia e comunicacao", papeis: ["Coordenador"], status: "ATIVO", criadoEm: 1 });
    await ctx.db.insert("ministerios", { nome: "Som", descricao: "Ministerio de sonorizacao", papeis: ["Coordenador"], status: "ATIVO", criadoEm: 1 });

    await ctx.db.insert("multimidiaChecklistTemplate", { item: "Montar apresentacao", ordem: 1, ativo: true });
    await ctx.db.insert("multimidiaChecklistTemplate", { item: "Conferir avisos", ordem: 2, ativo: true });
  });
}

const rodar = (t: T, args: { dryRun?: boolean }) =>
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  t.mutation(internal.migration.textosAcentos.run, args) as Promise<{
    dryRun: boolean;
    funcoes: number;
    modulos: number;
    ministerios: number;
    checklistTemplate: number;
    cursos: number;
    turmas: number;
    turmaEncontros: number;
  }>;

const ZERO_TURMAS = { cursos: 0, turmas: 0, turmaEncontros: 0 };
const NM_TITULO_ANTIGO = "Introducao: Paulo e a Igreja de Efeso";
const NM_TURMA_ANTIGA =
  "Seja bem-vindo(a)! Este questionario tem o proposito de conhecer melhor os " +
  "participantes interessados no Estudo para Candidatos a Novos Membros, um curso " +
  "voltado para aqueles que desejam integrar oficialmente a Igreja Presbiteriana do " +
  "Caminho. Ao enviar este formulario, voce demonstra interesse em participar e esta " +
  "ciente dos compromissos envolvidos, incluindo o limite de 3 faltas e a entrevista " +
  "final com os presbiteros.";
const NM_DETALHE_ANTIGO = "caps. 1-2 (p. 31 e 49) — Efesios 1.1-14 e 1.15-23";
const NM_DETALHE_NOVO = "caps. 1-2 (p. 31 e 49) — Efésios 1.1-14 e 1.15-23";
const NM_DESCRICAO_ANTIGA =
  "O curso tem como proposito apresentar os fundamentos biblicos que sustentam " +
  "nossa identidade como igreja presbiteriana, segundo os principios da Escritura " +
  "Sagrada. Ao longo dos encontros, estudaremos a Epistola de Paulo aos Efesios e o " +
  "livro Recriados Pela Graca, do pastor Bernardo Cho, buscando compreender como o " +
  "poder da ressurreicao de Cristo molda a vida, a comunhao e o testemunho da Igreja.";

async function semearTurmas(t: T, editado = false) {
  return await t.run(async (ctx) => {
    const cursoId = await ctx.db.insert("cursos", {
      nome: "Curso de Novos Membros",
      descricao: editado ? "Descrição própria do curso" : NM_DESCRICAO_ANTIGA,
      ementa: "Ementa já editada",
      planoAulas: [{ titulo: editado ? "Aula inaugural" : NM_TITULO_ANTIGO, detalhe: editado ? "Ler o cap. 1" : NM_DETALHE_ANTIGO }, { titulo: "Conversa sobre a IPB" }],
      frequenciaMinima: 75,
      status: "ATIVO",
      criadoEm: 1,
    });
    const turmaId = await ctx.db.insert("turmas", {
      nome: "Novos Membros 2/2026",
      cursoId,
      descricao: editado ? "Descrição própria da turma" : NM_TURMA_ANTIGA,
      dataInicio: "2026-09-20",
      vagasOcupadas: 0,
      status: "ABERTA",
      camposSistema: [],
      token: "tok",
      criadoEm: 1,
    });
    await ctx.db.insert("turmaEncontros", { turmaId, data: "2026-09-20", titulo: editado ? "Aula inaugural" : NM_TITULO_ANTIGO, observacoes: editado ? "Ler o cap. 1" : NM_DETALHE_ANTIGO, criadoEm: 1 });
    await ctx.db.insert("turmaEncontros", { turmaId, data: "2026-09-27", titulo: "Conversa sobre a IPB", criadoEm: 1 });
    return { cursoId, turmaId };
  });
}

describe("migration/textosAcentos", () => {
  it("troca o texto exatamente igual ao antigo nas tabelas semeadas e mantém o slug", async () => {
    const t = convexTest(schema, modules);
    await semear(t);
    const r = await rodar(t, { dryRun: false });
    expect(r).toEqual({ dryRun: false, funcoes: 3, modulos: 2, ministerios: 2, checklistTemplate: 1, ...ZERO_TURMAS });

    await t.run(async (ctx) => {
      const funcoes = await ctx.db.query("funcoes").collect();
      expect(funcoes.map((f) => [f.slug, f.label]).sort()).toEqual([
        ["ABERTURA", "Abertura"],
        ["CONFISSAO", "Confissão"],
        ["MULTIMIDIA", "Multimídia"],
        ["PREGACAO", "Pregação"],
      ]);
      const dir = await ctx.db.query("modulos").withIndex("by_slug", (q) => q.eq("slug", "diretorio")).unique();
      expect(dir?.label).toBe("Diretório");
      expect(dir?.descricao).toBe("Diretório de contatos");
      const membros = await ctx.db.query("modulos").withIndex("by_slug", (q) => q.eq("slug", "membros")).unique();
      expect(membros?.descricao).toBe("Cadastro e gestão de membros");
      const min = await ctx.db.query("ministerios").collect();
      expect(min.map((m) => [m.nome, m.descricao]).sort()).toEqual([
        ["Multimídia", "Ministério de mídia e comunicação"],
        ["Som", "Ministério de sonorização"],
      ]);
      const itens = await ctx.db.query("multimidiaChecklistTemplate").collect();
      expect(itens.map((i) => i.item).sort()).toEqual(["Conferir avisos", "Montar apresentação"]);
    });
  });

  it("não altera texto editado pelo admin", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("funcoes", {
        slug: "PREGACAO", label: "Pregação da Palavra", multiplo: false, temEquipe: false,
        temPassagem: false, views: ["escala"], ordem: 1, ativo: true,
      });
      await ctx.db.insert("ministerios", {
        nome: "Multimidia", descricao: "Descrição própria do ministério", papeis: [], status: "ATIVO", criadoEm: 1,
      });
    });
    const r = await rodar(t, { dryRun: false });
    expect(r.funcoes).toBe(0);
    // o nome ainda é o antigo (conta), a descrição própria não
    expect(r.ministerios).toBe(1);
    await t.run(async (ctx) => {
      const f = await ctx.db.query("funcoes").first();
      expect(f?.label).toBe("Pregação da Palavra");
      const m = await ctx.db.query("ministerios").first();
      expect(m?.nome).toBe("Multimídia");
      expect(m?.descricao).toBe("Descrição própria do ministério");
    });
  });

  it("segunda execução devolve zero em todas as tabelas", async () => {
    const t = convexTest(schema, modules);
    await semear(t);
    await rodar(t, { dryRun: false });
    const r = await rodar(t, { dryRun: false });
    expect(r).toEqual({ dryRun: false, funcoes: 0, modulos: 0, ministerios: 0, checklistTemplate: 0, ...ZERO_TURMAS });
  });

  it("dryRun e chamada sem argumento contam e não gravam", async () => {
    const t = convexTest(schema, modules);
    await semear(t);
    await semearTurmas(t);
    const esperado = { funcoes: 3, modulos: 2, ministerios: 2, checklistTemplate: 1, cursos: 1, turmas: 1, turmaEncontros: 1 };
    expect(await rodar(t, { dryRun: true })).toEqual({ dryRun: true, ...esperado });
    expect(await rodar(t, {})).toEqual({ dryRun: true, ...esperado });
    await t.run(async (ctx) => {
      const labels = (await ctx.db.query("funcoes").collect()).map((f) => f.label);
      expect(labels).toContain("Confissao");
      const m = await ctx.db.query("ministerios").collect();
      expect(m.map((x) => x.nome)).toContain("Multimidia");
      const mod = await ctx.db.query("modulos").withIndex("by_slug", (q) => q.eq("slug", "diretorio")).unique();
      expect(mod?.label).toBe("Diretorio");
      expect(mod?.descricao).toBe("Diretorio de contatos");
      const item = await ctx.db.query("multimidiaChecklistTemplate").first();
      expect(item?.item).toBe("Montar apresentacao");
      expect((await ctx.db.query("cursos").first())?.planoAulas?.[0].titulo).toBe(NM_TITULO_ANTIGO);
      expect((await ctx.db.query("turmas").first())?.descricao).toBe(NM_TURMA_ANTIGA);
      expect((await ctx.db.query("cursos").first())?.descricao).toBe(NM_DESCRICAO_ANTIGA);
      const encontros = await ctx.db.query("turmaEncontros").collect();
      expect(encontros.map((e) => e.titulo)).toContain(NM_TITULO_ANTIGO);
      expect(encontros.map((e) => e.observacoes)).toContain(NM_DETALHE_ANTIGO);
      expect((await ctx.db.query("cursos").first())?.planoAulas?.[0].detalhe).toBe(NM_DETALHE_ANTIGO);
      const min2 = await ctx.db.query("ministerios").collect();
      expect(min2.map((x) => x.descricao)).toContain("Ministerio de midia e comunicacao");
    });
  });

  it("não toca nas cópias por culto de multimidiaChecklist", async () => {
    const t = convexTest(schema, modules);
    await semear(t);
    const id = await t.run(async (ctx) => {
      const cultoId = await ctx.db.insert("cultos", {
        data: "2026-11-15", tipo: "DOMINICAL", status: "RASCUNHO",
      });
      return await ctx.db.insert("multimidiaChecklist", {
        cultoId, item: "Montar apresentacao", ordem: 1, concluido: false,
      });
    });
    await rodar(t, { dryRun: false });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(id))?.item).toBe("Montar apresentacao");
    });
  });
});

describe("migration/textosAcentos — turmas", () => {
  it("troca curso, turma e encontros só quando o texto é exatamente o antigo", async () => {
    const t = convexTest(schema, modules);
    await semearTurmas(t);
    const r = await rodar(t, { dryRun: false });
    expect(r).toMatchObject({ cursos: 1, turmas: 1, turmaEncontros: 1 });
    await t.run(async (ctx) => {
      const curso = await ctx.db.query("cursos").first();
      expect(curso?.descricao).toContain("propósito apresentar os fundamentos bíblicos");
      expect(curso?.descricao).toContain("Epístola de Paulo aos Efésios");
      expect(curso?.planoAulas?.[0]).toEqual({ titulo: "Introdução: Paulo e a Igreja de Éfeso", detalhe: NM_DETALHE_NOVO });
      expect(curso?.planoAulas?.[1].titulo).toBe("Conversa sobre a IPB");
      expect(curso?.ementa).toBe("Ementa já editada");
      const turma = await ctx.db.query("turmas").first();
      expect(turma?.descricao).toContain("questionário tem o propósito");
      const encontros = await ctx.db.query("turmaEncontros").collect();
      expect(encontros.map((e) => e.titulo).sort()).toEqual(["Conversa sobre a IPB", "Introdução: Paulo e a Igreja de Éfeso"]);
      expect(encontros.map((e) => e.observacoes)).toContain(NM_DETALHE_NOVO);
    });
    expect(await rodar(t, { dryRun: false })).toMatchObject(ZERO_TURMAS);
  });

  it("não mexe em texto editado de curso, turma e encontros", async () => {
    const t = convexTest(schema, modules);
    await semearTurmas(t, true);
    expect(await rodar(t, { dryRun: false })).toMatchObject(ZERO_TURMAS);
    await t.run(async (ctx) => {
      expect((await ctx.db.query("cursos").first())?.descricao).toBe("Descrição própria do curso");
      expect((await ctx.db.query("cursos").first())?.planoAulas?.[0].titulo).toBe("Aula inaugural");
      expect((await ctx.db.query("turmas").first())?.descricao).toBe("Descrição própria da turma");
      const encontros = await ctx.db.query("turmaEncontros").collect();
      expect(encontros.map((e) => e.titulo)).toContain("Aula inaugural");
      expect(encontros.map((e) => e.observacoes)).toContain("Ler o cap. 1");
      expect((await ctx.db.query("cursos").first())?.planoAulas?.[0].detalhe).toBe("Ler o cap. 1");
    });
  });
});

describe("migration/textosAcentos — turmas (casos de borda)", () => {
  const cursoBase = { nome: "Curso de Novos Membros", frequenciaMinima: 75, criadoEm: 1 };
  const turmaBase = { dataInicio: "2026-09-20", vagasOcupadas: 0, status: "ABERTA" as const, camposSistema: [], criadoEm: 1 };

  it("curso INATIVO e curso duplicado são migrados, cada um com suas turmas", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const status of ["ATIVO", "INATIVO"] as const) {
        const cursoId = await ctx.db.insert("cursos", {
          ...cursoBase, status, planoAulas: [{ titulo: NM_TITULO_ANTIGO }],
        });
        const turmaId = await ctx.db.insert("turmas", { ...turmaBase, nome: `Turma ${status}`, cursoId, token: status });
        await ctx.db.insert("turmaEncontros", { turmaId, data: "2026-09-20", titulo: NM_TITULO_ANTIGO, criadoEm: 1 });
      }
    });
    expect(await rodar(t, { dryRun: false })).toMatchObject({ cursos: 2, turmas: 0, turmaEncontros: 2 });
    await t.run(async (ctx) => {
      const cursos = await ctx.db.query("cursos").collect();
      expect(cursos.map((c) => c.planoAulas?.[0].titulo)).toEqual(Array(2).fill("Introdução: Paulo e a Igreja de Éfeso"));
      const e = await ctx.db.query("turmaEncontros").collect();
      expect(e.map((x) => x.titulo)).toEqual(Array(2).fill("Introdução: Paulo e a Igreja de Éfeso"));
    });
  });

  it("migra os encontros de uma segunda turma do mesmo curso, sem mexer na descrição dela", async () => {
    const t = convexTest(schema, modules);
    const { cursoId } = await semearTurmas(t);
    const outra = await t.run(async (ctx) => {
      const turmaId = await ctx.db.insert("turmas", {
        ...turmaBase, nome: "Novos Membros 1/2027", cursoId, token: "outra", descricao: NM_TURMA_ANTIGA,
      });
      await ctx.db.insert("turmaEncontros", { turmaId, data: "2027-03-07", titulo: NM_TITULO_ANTIGO, observacoes: NM_DETALHE_ANTIGO, criadoEm: 1 });
      return turmaId;
    });
    expect(await rodar(t, { dryRun: false })).toMatchObject({ cursos: 1, turmas: 1, turmaEncontros: 2 });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(outra))?.descricao).toBe(NM_TURMA_ANTIGA);
      const e = await ctx.db.query("turmaEncontros").withIndex("by_turma", (q) => q.eq("turmaId", outra)).collect();
      expect(e[0].titulo).toBe("Introdução: Paulo e a Igreja de Éfeso");
      expect(e[0].observacoes).toBe(NM_DETALHE_NOVO);
    });
  });

  it("planoAulas misto (antigo, editado, antigo) troca só os antigos", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) =>
      ctx.db.insert("cursos", {
        ...cursoBase, status: "ATIVO",
        planoAulas: [
          { titulo: NM_TITULO_ANTIGO, detalhe: NM_DETALHE_ANTIGO },
          { titulo: "Aula editada pelo admin", detalhe: "Leitura própria" },
          { titulo: "Separacao das obras das trevas · Unidade no casamento" },
        ],
      }),
    );
    await rodar(t, { dryRun: false });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(id))?.planoAulas).toEqual([
        { titulo: "Introdução: Paulo e a Igreja de Éfeso", detalhe: NM_DETALHE_NOVO },
        { titulo: "Aula editada pelo admin", detalhe: "Leitura própria" },
        { titulo: "Separação das obras das trevas · Unidade no casamento" },
      ]);
    });
  });

  it("os textos antigos do mapa batem com os literais do main", () => {
    const m = MAPAS_TURMAS;
    expect(m.NM_TITULOS).toHaveLength(4);
    expect(m.NM_DETALHES).toHaveLength(6);
    expect(m.NM_TITULOS[0][0]).toBe("Introducao: Paulo e a Igreja de Efeso");
    expect(m.NM_TITULOS[2][0]).toBe("O misterio pelo qual vale a pena sofrer · Cheios da plenitude de Deus");
    expect(m.NM_DETALHES[0][0]).toBe("caps. 1-2 (p. 31 e 49) — Efesios 1.1-14 e 1.15-23");
    expect(m.NM_DETALHES[3][0]).toBe("caps. 7-8 (p. 109 e 131) — Efesios 4.1-16 e 4.17—5.2");
    expect(m.NM_DESCRICAO[0].startsWith("O curso tem como proposito apresentar os fundamentos biblicos")).toBe(true);
    expect(m.NM_EMENTA[0].startsWith("Material: Biblia Sagrada e Recriados Pela Graca (Bernardo Cho).")).toBe(true);
    expect(m.NM_TURMA_DESCRICAO[0]).toBe(NM_TURMA_ANTIGA);
    expect(m.NM_DESCRICAO[0]).toBe(NM_DESCRICAO_ANTIGA);
  });
});

describe("seedMinisterios", () => {
  it("não insere outro ministério quando já existe 'Multimidia' sem acento", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("ministerios", { nome: "Multimidia", papeis: [], status: "ATIVO", criadoEm: 1 });
    });
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await t.mutation(internal.ministerios.mutations.seedMinisterios, {});
    await t.run(async (ctx) => {
      const todos = await ctx.db.query("ministerios").collect();
      expect(todos.filter((m) => m.nome.startsWith("Multim"))).toHaveLength(1);
      expect(todos).toHaveLength(5);
    });
  });

  it("não duplica quando 'Multimídia' (com acento) já está gravado", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("ministerios", { nome: "Multimídia", papeis: [], status: "ATIVO", criadoEm: 1 });
    });
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await t.mutation(internal.ministerios.mutations.seedMinisterios, {});
    await t.run(async (ctx) => {
      const todos = await ctx.db.query("ministerios").collect();
      expect(todos.filter((m) => m.nome.startsWith("Multim"))).toHaveLength(1);
      expect(todos).toHaveLength(5);
    });
  });

  it("rodado duas vezes termina com 5 ministérios", async () => {
    const t = convexTest(schema, modules);
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await t.mutation(internal.ministerios.mutations.seedMinisterios, {});
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await t.mutation(internal.ministerios.mutations.seedMinisterios, {});
    await t.run(async (ctx) => {
      expect(await ctx.db.query("ministerios").collect()).toHaveLength(5);
    });
  });
});
