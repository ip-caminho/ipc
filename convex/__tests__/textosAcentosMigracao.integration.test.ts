import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

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
  }>;

describe("migration/textosAcentos", () => {
  it("troca o texto exatamente igual ao antigo nas quatro tabelas e mantém o slug", async () => {
    const t = convexTest(schema, modules);
    await semear(t);
    const r = await rodar(t, { dryRun: false });
    expect(r).toEqual({ dryRun: false, funcoes: 3, modulos: 2, ministerios: 2, checklistTemplate: 1 });

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
    expect(r).toEqual({ dryRun: false, funcoes: 0, modulos: 0, ministerios: 0, checklistTemplate: 0 });
  });

  it("dryRun e chamada sem argumento contam e não gravam", async () => {
    const t = convexTest(schema, modules);
    await semear(t);
    const esperado = { funcoes: 3, modulos: 2, ministerios: 2, checklistTemplate: 1 };
    expect(await rodar(t, { dryRun: true })).toEqual({ dryRun: true, ...esperado });
    expect(await rodar(t, {})).toEqual({ dryRun: true, ...esperado });
    await t.run(async (ctx) => {
      const labels = (await ctx.db.query("funcoes").collect()).map((f) => f.label);
      expect(labels).toContain("Confissao");
      const m = await ctx.db.query("ministerios").collect();
      expect(m.map((x) => x.nome)).toContain("Multimidia");
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
});
