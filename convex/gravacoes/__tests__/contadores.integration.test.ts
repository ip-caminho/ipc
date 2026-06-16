import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";

async function seedAdmin(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const membroId = await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: "Admin",
    });
    return ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
  });
  return { ctx: t.withIdentity({ subject: `${userId}|s` }), membroId };
}

async function seedSermao(
  t: ReturnType<typeof convexTest>,
  extra: Partial<Doc<"gravacoes">> = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("gravacoes", {
      titulo: "Sermao Teste",
      tipo: "SERMAO",
      data: "2026-06-01",
      status: "PUBLICADO",
      ...extra,
    }),
  );
}

describe("contadores denormalizados de gravacoes", () => {
  it("toggleReacao mantem reacoesResumo por tipo (add/remove)", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await seedAdmin(t);
    const id = await seedSermao(t);

    await ctx.mutation(api.gravacoes.comentarios.toggleReacao, { gravacaoId: id, tipo: "❤️" });
    await ctx.mutation(api.gravacoes.comentarios.toggleReacao, { gravacaoId: id, tipo: "🙏" });

    let g = await t.run((c) => c.db.get(id));
    expect(g!.reacoesResumo).toEqual([{ tipo: "❤️", count: 1 }, { tipo: "🙏", count: 1 }]);

    // Remove a reacao de coracao (toggle de novo)
    await ctx.mutation(api.gravacoes.comentarios.toggleReacao, { gravacaoId: id, tipo: "❤️" });
    g = await t.run((c) => c.db.get(id));
    expect(g!.reacoesResumo).toEqual([{ tipo: "🙏", count: 1 }]);
  });

  it("create/remove comentario mantem comentariosCount, incluindo replies", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await seedAdmin(t);
    const id = await seedSermao(t);

    const c1 = await ctx.mutation(api.gravacoes.comentarios.create, { gravacaoId: id, texto: "primeiro" });
    await ctx.mutation(api.gravacoes.comentarios.create, { gravacaoId: id, texto: "segundo" });
    await ctx.mutation(api.gravacoes.comentarios.create, { gravacaoId: id, texto: "reply", parentId: c1 });

    let g = await t.run((c) => c.db.get(id));
    expect(g!.comentariosCount).toBe(3);

    // Remover c1 apaga c1 + sua reply -> -2
    await ctx.mutation(api.gravacoes.comentarios.remove, { id: c1 });
    g = await t.run((c) => c.db.get(id));
    expect(g!.comentariosCount).toBe(1);
  });

  it("list reflete os contadores denormalizados", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await seedAdmin(t);
    const id = await seedSermao(t);
    await ctx.mutation(api.gravacoes.comentarios.toggleReacao, { gravacaoId: id, tipo: "🔥" });
    await ctx.mutation(api.gravacoes.comentarios.create, { gravacaoId: id, texto: "oi" });

    const lista = await ctx.query(api.gravacoes.queries.list, {});
    const item = lista.find((g) => g._id === id)!;
    expect(item.comentarioCount).toBe(1);
    expect(item.reacoesSummary).toEqual([{ tipo: "🔥", count: 1 }]);
  });

  it("backfillContadores recalcula valor absoluto e e idempotente", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedAdmin(t);
    const id = await seedSermao(t);

    // Insere reacoes/comentarios direto (sem passar pelas mutations que mantem
    // o contador) — simula dados pre-backfill / divergentes.
    await t.run(async (c) => {
      await c.db.insert("reacoesGravacao", { gravacaoId: id, membroId, tipo: "👏", createdAt: 1 });
      await c.db.insert("reacoesGravacao", { gravacaoId: id, membroId, tipo: "👏", createdAt: 2 });
      await c.db.insert("comentarios", {
        entidadeTipo: "gravacoes", entidadeId: id, membroId, texto: "x", criadoEm: 1,
      });
    });

    await t.mutation(internal.gravacoes.migrations.backfillContadores, {});
    let g = await t.run((c) => c.db.get(id));
    expect(g!.reacoesResumo).toEqual([{ tipo: "👏", count: 2 }]);
    expect(g!.comentariosCount).toBe(1);

    // Rodar de novo nao muda (idempotente)
    await t.mutation(internal.gravacoes.migrations.backfillContadores, {});
    g = await t.run((c) => c.db.get(id));
    expect(g!.reacoesResumo).toEqual([{ tipo: "👏", count: 2 }]);
    expect(g!.comentariosCount).toBe(1);
  });
});
