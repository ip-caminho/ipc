import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";

type T = ReturnType<typeof convexTest>;

async function seedMembro(t: T) {
  const userId = await t.run((ctx) => ctx.db.insert("users", {}));
  const membroId = await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: "Resp",
    });
    return ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
  });
  return { ctx: t.withIdentity({ subject: `${userId}|s` }), membroId };
}

async function seedTarefa(t: T, membroId: Id<"membros">) {
  return t.run((ctx) =>
    ctx.db.insert("tarefas", {
      titulo: "Tarefa",
      status: "ABERTA",
      prioridade: "MEDIA",
      criadoPor: membroId,
      responsavelId: membroId,
      criadoEm: 1,
    }),
  );
}

describe("tarefas.qtdComentarios denormalizado", () => {
  it("create/remove de comentario mantem o contador (incluindo replies)", async () => {
    const t = convexTest(schema, modules);
    const { ctx, membroId } = await seedMembro(t);
    const tarefaId = await seedTarefa(t, membroId);

    const c1 = await ctx.mutation(api.comentarios.mutations.create, {
      entidadeTipo: "tarefas",
      entidadeId: tarefaId,
      texto: "primeiro",
    });
    await ctx.mutation(api.comentarios.mutations.create, {
      entidadeTipo: "tarefas",
      entidadeId: tarefaId,
      texto: "resposta",
      parentId: c1,
    });

    let tarefa = await t.run((c) => c.db.get(tarefaId));
    expect(tarefa!.qtdComentarios).toBe(2);

    // Remover c1 apaga c1 + reply -> -2
    await ctx.mutation(api.comentarios.mutations.remove, { id: c1 });
    tarefa = await t.run((c) => c.db.get(tarefaId));
    expect(tarefa!.qtdComentarios).toBe(0);
  });

  it("backfill recalcula valor absoluto e e idempotente", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembro(t);
    const tarefaId = await seedTarefa(t, membroId);

    // Insere comentarios sem passar pela mutation (simula divergencia)
    await t.run(async (c) => {
      await c.db.insert("comentarios", { entidadeTipo: "tarefas", entidadeId: tarefaId, membroId, texto: "a", criadoEm: 1 });
      await c.db.insert("comentarios", { entidadeTipo: "tarefas", entidadeId: tarefaId, membroId, texto: "b", criadoEm: 2 });
    });

    await t.mutation(internal.tarefas.migrations.backfillQtdComentarios, {});
    let tarefa = await t.run((c) => c.db.get(tarefaId));
    expect(tarefa!.qtdComentarios).toBe(2);

    await t.mutation(internal.tarefas.migrations.backfillQtdComentarios, {});
    tarefa = await t.run((c) => c.db.get(tarefaId));
    expect(tarefa!.qtdComentarios).toBe(2);
  });
});
