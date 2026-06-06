import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";

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

async function pessoa(
  t: ReturnType<typeof convexTest>,
  nome: string,
  sexo: "M" | "F",
  dataNascimento?: string
) {
  return t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: nome,
      sexo,
      dataNascimento,
    });
    const membroId = await ctx.db.insert("membros", { entidadeId, role: "membro" });
    return { entidadeId, membroId };
  });
}

describe("listParaSecretario — agrupamento por familia", () => {
  it("chefe=homem, conjuge=esposa, filhos como dependentes", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    const pai = await pessoa(t, "Joao Pai", "M");
    const mae = await pessoa(t, "Maria Mae", "F");
    const f1 = await pessoa(t, "Filho Velho", "M", "2010-03-01");
    const f2 = await pessoa(t, "Filha Nova", "F", "2015-08-20");

    await t.run(async (ctx) => {
      // casal
      await ctx.db.patch(pai.membroId, { conjugeId: mae.entidadeId });
      await ctx.db.patch(mae.membroId, { conjugeId: pai.entidadeId });
      // filhos vinculados ao pai e a mae
      for (const filho of [f1, f2]) {
        await ctx.db.insert("responsaveis", {
          criancaEntidadeId: filho.entidadeId,
          responsavelEntidadeId: pai.entidadeId,
          tipo: "PAI",
          principal: true,
          criadoEm: 1,
        });
        await ctx.db.insert("responsaveis", {
          criancaEntidadeId: filho.entidadeId,
          responsavelEntidadeId: mae.entidadeId,
          tipo: "MAE",
          principal: false,
          criadoEm: 1,
        });
      }
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const by = (nome: string) => linhas.find((l) => l.entidade.nomeCompleto === nome)!;

    const headId = pai.entidadeId;
    expect(by("Joao Pai").familiaHeadId).toBe(headId);
    expect(by("Joao Pai").familiaOrder).toBe(0);
    expect(by("Maria Mae").familiaHeadId).toBe(headId);
    expect(by("Maria Mae").familiaOrder).toBe(1);
    expect(by("Filho Velho").familiaHeadId).toBe(headId);
    expect(by("Filho Velho").familiaOrder).toBe(2);
    expect(by("Filha Nova").familiaHeadId).toBe(headId);
    expect(by("Filha Nova").familiaOrder).toBe(2);
    // datas presentes para o cliente ordenar (mais velho primeiro)
    expect(by("Filho Velho").dataNascimento).toBe("2010-03-01");
    expect(by("Filha Nova").dataNascimento).toBe("2015-08-20");
  });

  it("inclui filho DEPENDENTE (entidade sem membro) na familia", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const pai = await pessoa(t, "Andre Pai", "M");

    // Noah: entidade dependente, SEM registro de membro
    const noahEnt = await t.run(async (ctx) => {
      const e = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Noah Dependente",
        vinculoIgreja: "NAO_MEMBRO",
        dataNascimento: "2020-01-01",
      });
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: e,
        responsavelEntidadeId: pai.entidadeId,
        tipo: "PAI",
        principal: true,
        criadoEm: 1,
      });
      return e;
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const noah = linhas.find((l) => l.entidade.nomeCompleto === "Noah Dependente");
    expect(noah).toBeTruthy();
    expect(noah!.ehMembro).toBe(false);
    expect(noah!.entidadeId).toBe(noahEnt as Id<"entidades">);
    expect(noah!.familiaHeadId).toBe(pai.entidadeId);
    expect(noah!.familiaOrder).toBe(2);
  });

  it("tornarMembro promove dependente a membro", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    const entId = await t.run(async (ctx) =>
      ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Crianca Promovida",
        vinculoIgreja: "NAO_MEMBRO",
      })
    );

    const res = await admin.mutation(api.membros.eclesiastico.tornarMembro, {
      entidadeId: entId,
    });
    expect(res.jaEra).toBe(false);

    const { membro, entidade } = await t.run(async (ctx) => {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", entId))
        .first();
      const e = await ctx.db.get(entId);
      return { membro: m, entidade: e };
    });
    expect(membro).toBeTruthy();
    expect(membro?.cargoEclesiastico).toBe("MEMBRO_NAO_COMUNGANTE");
    expect(entidade?.vinculoIgreja).toBe("MEMBRO");
    expect(entidade?.papeis).toContain("MEMBRO");
    expect(entidade?.papeis).not.toContain("DEPENDENTE");

    // idempotente
    const dupe = await admin.mutation(api.membros.eclesiastico.tornarMembro, {
      entidadeId: entId,
    });
    expect(dupe.jaEra).toBe(true);
  });

  it("membro solteiro e seu proprio chefe", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const solo = await pessoa(t, "Solteiro Silva", "M");

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const l = linhas.find((x) => x.entidade.nomeCompleto === "Solteiro Silva")!;
    expect(l.familiaHeadId).toBe(solo.entidadeId as Id<"entidades">);
    expect(l.familiaOrder).toBe(0);
  });

  it("deriva rolCategoria de cargo + status", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    await pessoa(t, "Com Ungante", "M");
    const naoComungante = await pessoa(t, "Nao Comungante", "F");
    const transferido = await pessoa(t, "Foi Transferido", "M");
    await t.run(async (ctx) => {
      await ctx.db.patch(naoComungante.membroId, {
        cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
      });
      await ctx.db.patch(transferido.entidadeId, { status: "TRANSFERIDO" });
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const by = (n: string) => linhas.find((l) => l.entidade.nomeCompleto === n)!;
    expect(by("Com Ungante").rolCategoria).toBe("PRINCIPAL");
    expect(by("Nao Comungante").rolCategoria).toBe("SEPARADO");
    expect(by("Foi Transferido").rolCategoria).toBe("ARQUIVO");
  });

  it("vincularConjugeAdmin liga os dois lados", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const a = await pessoa(t, "Esposo A", "M");
    const b = await pessoa(t, "Esposa B", "F");

    await admin.mutation(api.membros.eclesiastico.vincularConjugeAdmin, {
      membroId: a.membroId,
      conjugeEntidadeId: b.entidadeId,
    });

    const { ma, mb } = await t.run(async (ctx) => ({
      ma: await ctx.db.get(a.membroId),
      mb: await ctx.db.get(b.membroId),
    }));
    expect(ma?.conjugeId).toBe(b.entidadeId);
    expect(mb?.conjugeId).toBe(a.entidadeId);
  });

  it("adicionarFilhoAdmin cria dependente vinculado e aparece na familia", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const pai = await pessoa(t, "Pai Admin", "M");

    await admin.mutation(api.membros.eclesiastico.adicionarFilhoAdmin, {
      responsavelMembroId: pai.membroId,
      nomeCompleto: "Filho Criado",
      dataNascimento: "2018-05-05",
      sexo: "M",
      batismoInfantil: false,
    });

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const filho = linhas.find((l) => l.entidade.nomeCompleto === "Filho Criado");
    expect(filho).toBeTruthy();
    expect(filho!.ehMembro).toBe(false);
    expect(filho!.familiaHeadId).toBe(pai.entidadeId);
    expect(filho!.familiaOrder).toBe(2);
  });

  it("getResumoSecretario conta categorias do rol", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const nc = await pessoa(t, "Nao Com", "F");
    const arq = await pessoa(t, "Arquivado", "M");
    const presb = await pessoa(t, "Presb Itero", "M");
    await t.run(async (ctx) => {
      await ctx.db.patch(nc.membroId, { cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE" });
      await ctx.db.patch(presb.membroId, { cargoEclesiastico: "PRESBITERO" });
      await ctx.db.patch(arq.entidadeId, { status: "TRANSFERIDO" });
      // dependente
      const dep = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Dep Endente",
        vinculoIgreja: "NAO_MEMBRO",
      });
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: dep,
        responsavelEntidadeId: arq.entidadeId,
        tipo: "PAI",
        principal: true,
        criadoEm: 1,
      });
    });

    const r = await admin.query(api.membros.eclesiastico.getResumoSecretario, {});
    expect(r.naoComungantes).toBe(1);
    expect(r.arquivo).toBe(1);
    expect(r.dependentes).toBe(1);
    expect(r.comungantes).toBeGreaterThanOrEqual(1); // admin
    expect(r.totalRol).toBe(r.comungantes + r.naoComungantes);
    expect(r.presbiteros).toBe(1);
  });

  it("detecta mandato vencido (cargo ATIVO com fim no passado)", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const presb = await pessoa(t, "Presb Vencido", "M");
    await t.run(async (ctx) => {
      await ctx.db.patch(presb.membroId, { cargoEclesiastico: "PRESBITERO" });
      await ctx.db.insert("cargosEclesiasticosHistorico", {
        membroId: presb.membroId,
        cargo: "PRESBITERO",
        mandatoInicio: "2015-01-01",
        mandatoFim: "2020-01-01", // no passado
        status: "ATIVO",
        registradoEm: 1,
        registradoPor: presb.membroId,
      });
    });

    const r = await admin.query(api.membros.eclesiastico.getResumoSecretario, {});
    expect(r.mandatosVencidos).toBe(1);

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const l = linhas.find((x) => x.entidade.nomeCompleto === "Presb Vencido");
    expect(l!.mandatoVencido).toBe(true);
  });

  it("detecta mandato a vencer em 90 dias", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const diac = await pessoa(t, "Diac Vencendo", "M");
    const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await t.run(async (ctx) => {
      await ctx.db.insert("cargosEclesiasticosHistorico", {
        membroId: diac.membroId,
        cargo: "DIACONO",
        mandatoInicio: "2023-01-01",
        mandatoFim: em30dias,
        status: "ATIVO",
        registradoEm: 1,
        registradoPor: diac.membroId,
      });
    });

    const r = await admin.query(api.membros.eclesiastico.getResumoSecretario, {});
    expect(r.mandatosVencendo).toBe(1);
    expect(r.mandatosVencidos).toBe(0);
  });

  it("deriva civilmente capaz pela idade (>= 18 anos)", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await pessoa(t, "Adulto Capaz", "M", "1990-01-01");
    await pessoa(t, "Menino Comungante", "M", "2020-01-01");

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {});
    const adulto = linhas.find((l) => l.entidade.nomeCompleto === "Adulto Capaz");
    const menino = linhas.find((l) => l.entidade.nomeCompleto === "Menino Comungante");
    expect(adulto!.civilmenteCapazes).toBe(true);
    expect(menino!.civilmenteCapazes).toBe(false);
  });

  it("filtra por busca mantendo metadados", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await pessoa(t, "Pedro Pesquisa", "M");
    await pessoa(t, "Outro Nome", "F");

    const linhas = await admin.query(api.membros.eclesiastico.listParaSecretario, {
      search: "pesquisa",
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0].entidade.nomeCompleto).toBe("Pedro Pesquisa");
  });

  it("adicionarFilhoAdmin vincula o filho tambem ao conjuge do responsavel", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const pai = await pessoa(t, "Pai Casal", "M");
    const mae = await pessoa(t, "Mae Casal", "F");

    await admin.mutation(api.membros.eclesiastico.vincularConjugeAdmin, {
      membroId: pai.membroId,
      conjugeEntidadeId: mae.entidadeId,
    });
    const { filhoEntidadeId } = await admin.mutation(api.membros.eclesiastico.adicionarFilhoAdmin, {
      responsavelMembroId: pai.membroId,
      nomeCompleto: "Filho do Casal",
      dataNascimento: "2019-01-01",
      sexo: "F",
      batismoInfantil: false,
    });

    const responsaveis = await t.run(async (ctx) =>
      ctx.db
        .query("responsaveis")
        .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
        .collect()
    );
    const ids = responsaveis.map((r) => r.responsavelEntidadeId);
    expect(ids).toContain(pai.entidadeId);
    expect(ids).toContain(mae.entidadeId);
    expect(responsaveis.find((r) => r.responsavelEntidadeId === mae.entidadeId)?.tipo).toBe("MAE");
  });

  it("tornarMembro espelha o conjuge de quem ja apontava para a entidade", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const esposo = await pessoa(t, "Esposo Membro", "M");
    // Esposa existe so como entidade (dependente), sem registro de membro
    const esposaEntidadeId = await t.run(async (ctx) =>
      ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Esposa Promovida",
        sexo: "F",
      })
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(esposo.membroId, { conjugeId: esposaEntidadeId });
    });

    const { membroId } = await admin.mutation(api.membros.eclesiastico.tornarMembro, {
      entidadeId: esposaEntidadeId,
    });

    const novaMembro = await t.run(async (ctx) => ctx.db.get(membroId));
    expect(novaMembro?.conjugeId).toBe(esposo.entidadeId);
  });

  it("migrateFamiliaBidirecional espelha conjuge e adiciona o conjuge como responsavel", async () => {
    const t = convexTest(schema, modules);
    const a = await pessoa(t, "Conjuge A", "M");
    const b = await pessoa(t, "Conjuge B", "F");
    // Vinculo assimetrico (so A aponta) + crianca com responsavel unico (A)
    const criancaEntidadeId = await t.run(async (ctx) => {
      await ctx.db.patch(a.membroId, { conjugeId: b.entidadeId });
      const cid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["DEPENDENTE"],
        status: "ATIVO",
        nomeCompleto: "Crianca Migrada",
        sexo: "M",
      });
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: cid,
        responsavelEntidadeId: a.entidadeId,
        tipo: "PAI",
        principal: true,
        criadoEm: Date.now(),
      });
      return cid;
    });

    const resultado = await t.mutation(internal.membros.migrations.migrateFamiliaBidirecional, {});
    expect(resultado).toEqual({ conjugesEspelhados: 1, responsaveisAdicionados: 1 });

    const { mb, responsaveis } = await t.run(async (ctx) => ({
      mb: await ctx.db.get(b.membroId),
      responsaveis: await ctx.db
        .query("responsaveis")
        .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", criancaEntidadeId))
        .collect(),
    }));
    expect(mb?.conjugeId).toBe(a.entidadeId);
    expect(responsaveis.map((r) => r.responsavelEntidadeId)).toContain(b.entidadeId);

    // Idempotencia: segunda rodada nao muda nada
    const segunda = await t.mutation(internal.membros.migrations.migrateFamiliaBidirecional, {});
    expect(segunda).toEqual({ conjugesEspelhados: 0, responsaveisAdicionados: 0 });
  });
});
