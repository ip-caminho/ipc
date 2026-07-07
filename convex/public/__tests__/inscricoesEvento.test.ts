import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("inscricoesEvento (integracao)", () => {
  it("minhasRespostas lista as inscricoes genericas do membro logado", async () => {
    const t = convexTest(schema, modules);

    // Membro logado
    const userId = await t.run((ctx) => ctx.db.insert("users", {}));
    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Joao Membro",
      });
      return ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });
    const asMembro = t.withIdentity({ subject: `${userId}|s` });

    // Sem login -> []
    expect(await t.query(api.public.inscricoesEvento.minhasRespostas, {})).toEqual([]);

    // Evento + resposta do membro (+ resposta de outro membro, que nao deve vir)
    await t.run(async (ctx) => {
      const ev = await ctx.db.insert("inscricoesEvento", {
        slug: "retiro-jovens",
        titulo: "Retiro de Jovens",
        descricao: "",
        ativa: true,
        vagasOcupadas: 0,
        camposSistema: ["nomeCompleto", "whatsapp"],
        camposCustom: [],
        criadoEm: 1,
      });
      await ctx.db.insert("respostasInscricaoEvento", {
        inscricaoId: ev,
        membroId,
        dadosSistema: { nomeCompleto: "Joao Membro" },
        dadosCustom: {},
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        ipHash: "h",
        criadoEm: 2,
      });
      await ctx.db.insert("respostasInscricaoEvento", {
        inscricaoId: ev,
        dadosSistema: { nomeCompleto: "Anonimo" },
        dadosCustom: {},
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        ipHash: "h",
        criadoEm: 3,
      });
    });

    const lista = await asMembro.query(api.public.inscricoesEvento.minhasRespostas, {});
    expect(lista).toHaveLength(1);
    expect(lista[0].titulo).toBe("Retiro de Jovens");
    expect(lista[0].status).toBe("CONFIRMADA");
  });
});
