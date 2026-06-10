import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { extrairFrases } from "../iaHelpers";

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

async function seedSermao(t: ReturnType<typeof convexTest>, extra: Partial<Doc<"gravacoes">> = {}) {
  return t.run(async (ctx) =>
    ctx.db.insert("gravacoes", {
      titulo: "Sermao Teste",
      tipo: "SERMAO",
      data: "2026-06-01",
      status: "PUBLICADO",
      ...extra,
    })
  );
}

const RESULTADO = {
  temaCentral: { titulo: "Tema", passagemBiblica: "Jo 3.16" },
  fraseChave: "Frase chave do sermao",
  frasesRedesSociais: ["Frase social 1", "Frase social 2"],
};

describe("extrairFrases", () => {
  it("junta fraseChave + frasesRedesSociais e ignora vazios", () => {
    expect(extrairFrases(RESULTADO)).toEqual([
      "Frase chave do sermao",
      "Frase social 1",
      "Frase social 2",
    ]);
    expect(extrairFrases({ frasesRedesSociais: ["", "  ", "ok"] })).toEqual(["ok"]);
    expect(extrairFrases({})).toBeUndefined();
    expect(extrairFrases(null)).toBeUndefined();
  });
});

describe("gravacoesIA (campos pesados separados)", () => {
  it("updateIaStatus grava transcricao/resultado em gravacoesIA e iaFrases na gravacao", async () => {
    const t = convexTest(schema, modules);
    const id = await seedSermao(t);

    await t.mutation(internal.gravacoes.ai.updateIaStatus, {
      id,
      iaStatus: "ANALISANDO",
      iaTranscricao: "transcricao longa...",
    });
    await t.mutation(internal.gravacoes.ai.updateIaStatus, {
      id,
      iaStatus: "CONCLUIDO",
      iaResultado: RESULTADO,
    });

    await t.run(async (ctx) => {
      const gravacao = await ctx.db.get(id);
      expect(gravacao!.iaTranscricao).toBeUndefined();
      expect(gravacao!.iaResultado).toBeUndefined();
      expect(gravacao!.iaFrases).toEqual([
        "Frase chave do sermao",
        "Frase social 1",
        "Frase social 2",
      ]);
      expect(gravacao!.iaStatus).toBe("CONCLUIDO");

      const ia = await ctx.db
        .query("gravacoesIA")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", id))
        .collect();
      expect(ia).toHaveLength(1);
      expect(ia[0].transcricao).toBe("transcricao longa...");
      expect(ia[0].resultado).toEqual(RESULTADO);
    });
  });

  it("getById faz merge da transcricao/resultado de gravacoesIA", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await seedSermao(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("gravacoesIA", {
        gravacaoId: id,
        transcricao: "trans",
        resultado: RESULTADO,
      });
    });

    const g = await admin.query(api.gravacoes.queries.getById, { id });
    expect(g!.iaTranscricao).toBe("trans");
    expect(g!.iaResultado).toEqual(RESULTADO);
  });

  it("getById mantem fallback aos campos legados pre-migracao", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const id = await seedSermao(t, { iaTranscricao: "legado", iaResultado: RESULTADO });

    const g = await admin.query(api.gravacoes.queries.getById, { id });
    expect(g!.iaTranscricao).toBe("legado");
    expect(g!.iaResultado).toEqual(RESULTADO);
  });

  it("list e listRecentesByTipo nao retornam campos pesados legados", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await seedSermao(t, { iaTranscricao: "legado", iaResultado: RESULTADO });

    const lista = await admin.query(api.gravacoes.queries.list, {});
    expect(lista).toHaveLength(1);
    expect("iaTranscricao" in lista[0]).toBe(false);
    expect("iaResultado" in lista[0]).toBe(false);

    const recentes = await admin.query(api.gravacoes.queries.listRecentesByTipo, {
      tipo: "SERMAO",
    });
    expect(recentes).toHaveLength(1);
    expect("iaTranscricao" in recentes[0]).toBe(false);
    expect("iaResultado" in recentes[0]).toBe(false);
  });

  it("listFrases usa iaFrases e cai no iaResultado legado quando ausente", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await seedSermao(t, { iaStatus: "CONCLUIDO", iaFrases: ["nova frase"], pregadorNome: "Pr. A" });
    await seedSermao(t, { iaStatus: "CONCLUIDO", iaResultado: RESULTADO, pregadorNome: "Pr. B" });

    const frases = await admin.query(api.gravacoes.queries.listFrases, {});
    const textos = frases.map((f) => f.frase);
    expect(textos).toContain("nova frase");
    expect(textos).toContain("Frase chave do sermao");
    expect(textos).toContain("Frase social 2");
  });

  it("migrarIaParaTabela move campos legados e limpa a gravacao", async () => {
    const t = convexTest(schema, modules);
    const id = await seedSermao(t, { iaTranscricao: "legado", iaResultado: RESULTADO });
    const semIa = await seedSermao(t, { titulo: "Sem IA" });

    const res = await t.mutation(internal.gravacoes.migrations.migrarIaParaTabela, {});
    expect(res.isDone).toBe(true);
    expect(res.movidos).toBe(1);

    await t.run(async (ctx) => {
      const g = await ctx.db.get(id);
      expect(g!.iaTranscricao).toBeUndefined();
      expect(g!.iaResultado).toBeUndefined();
      expect(g!.iaFrases).toEqual([
        "Frase chave do sermao",
        "Frase social 1",
        "Frase social 2",
      ]);

      const ia = await ctx.db
        .query("gravacoesIA")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", id))
        .first();
      expect(ia!.transcricao).toBe("legado");
      expect(ia!.resultado).toEqual(RESULTADO);

      const outras = await ctx.db
        .query("gravacoesIA")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", semIa))
        .collect();
      expect(outras).toHaveLength(0);
    });
  });
});
