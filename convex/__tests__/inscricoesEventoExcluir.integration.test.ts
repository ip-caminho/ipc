import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";

// Excluir formulário: só com zero respostas (qualquer status) e com
// inscricoes:manage.

type T = ReturnType<typeof convexTest>;

async function seedInscricao(t: T) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("inscricoesEvento", {
      slug: "evento-teste",
      titulo: "Evento de teste",
      descricao: "Descrição",
      ativa: true,
      vagasOcupadas: 0,
      camposSistema: ["nomeCompleto"],
      camposCustom: [],
      criadoEm: 1,
    })
  );
}

async function seedResposta(
  t: T,
  inscricaoId: Id<"inscricoesEvento">,
  status: "CONFIRMADA" | "LISTA_ESPERA"
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("respostasInscricaoEvento", {
      inscricaoId,
      dadosSistema: { nomeCompleto: "Pessoa Teste" },
      dadosCustom: {},
      status,
      lgpdConsentimento: true,
      ipHash: "hash-teste",
      criadoEm: 1,
    });
  });
}

async function seedGestor(t: T) {
  return await seedUser(t, { role: "membro", permissions: ["inscricoes:manage"] });
}

describe("inscricoesEvento.mutations.excluir", () => {
  it("exclui formulário sem respostas e registra auditoria DELETE", async () => {
    const t = convexTest(schema, modules);
    const id = await seedInscricao(t);
    const gestor = await seedGestor(t);

    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await as(t, gestor).mutation(api.inscricoesEvento.mutations.excluir, { id });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(id)).toBeNull();
      const logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_referencia", (q) =>
          q.eq("referenciaTabela", "inscricoesEvento").eq("referenciaId", id)
        )
        .collect();
      expect(logs.some((l) => l.action === "DELETE")).toBe(true);
    });
  });

  it("recusa quando há resposta CONFIRMADA", async () => {
    const t = convexTest(schema, modules);
    const id = await seedInscricao(t);
    await seedResposta(t, id, "CONFIRMADA");
    const gestor = await seedGestor(t);

    await expect(
      as(t, gestor).mutation(api.inscricoesEvento.mutations.excluir, { id })
    ).rejects.toThrow(/Exclua as respostas/);

    await t.run(async (ctx) => {
      expect(await ctx.db.get(id)).not.toBeNull();
    });
  });

  it("recusa quando há resposta em LISTA_ESPERA (mesmo com vagasOcupadas 0)", async () => {
    const t = convexTest(schema, modules);
    const id = await seedInscricao(t);
    await seedResposta(t, id, "LISTA_ESPERA");
    const gestor = await seedGestor(t);

    await expect(
      as(t, gestor).mutation(api.inscricoesEvento.mutations.excluir, { id })
    ).rejects.toThrow(/Exclua as respostas/);

    await t.run(async (ctx) => {
      expect(await ctx.db.get(id)).not.toBeNull();
    });
  });

  it("recusa sem a permissão inscricoes:manage", async () => {
    const t = convexTest(schema, modules);
    const id = await seedInscricao(t);
    const comum = await seedUser(t, { role: "membro", permissions: [] });

    await expect(
      as(t, comum).mutation(api.inscricoesEvento.mutations.excluir, { id })
    ).rejects.toThrow();

    await t.run(async (ctx) => {
      expect(await ctx.db.get(id)).not.toBeNull();
    });
  });
});
