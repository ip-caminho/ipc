import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("gravacoes cascade delete", () => {
  async function seedWithRelations(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Pastor João",
      });
      const membroId = await ctx.db.insert("membros", {
        entidadeId,
        role: "admin",
        userId,
      });

      // Gravação SEM audioUrl — evita scheduler de B2 delete (action "use node")
      const gravacaoId = await ctx.db.insert("gravacoes", {
        titulo: "Sermão Teste",
        tipo: "SERMAO",
        data: "2026-03-13",
        status: "PUBLICADO",
      });

      const comentarioId = await ctx.db.insert("comentariosGravacao", {
        gravacaoId,
        membroId,
        texto: "Excelente sermão!",
        createdAt: Date.now(),
      });
      await ctx.db.insert("comentariosGravacao", {
        gravacaoId,
        membroId,
        texto: "Concordo!",
        parentId: comentarioId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("reacoesGravacao", {
        gravacaoId,
        membroId,
        tipo: "❤️",
        createdAt: Date.now(),
      });
      await ctx.db.insert("escutasGravacao", {
        gravacaoId,
        membroId,
        ultimoSegundo: 120,
        duracaoTotal: 2400,
        progresso: 5,
        completou: false,
        iniciadoEm: Date.now(),
        atualizadoEm: Date.now(),
      });

      return { gravacaoId, membroId, entidadeId, userId };
    });
  }

  it("remove gravação e todos os registros relacionados (comentários, reações, escutas)", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedWithRelations(t);

    // Verify records exist
    const before = await t.run(async (ctx) => ({
      comentarios: await ctx.db
        .query("comentariosGravacao")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", ids.gravacaoId))
        .collect(),
      reacoes: await ctx.db
        .query("reacoesGravacao")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", ids.gravacaoId))
        .collect(),
      escutas: await ctx.db
        .query("escutasGravacao")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", ids.gravacaoId))
        .collect(),
    }));

    expect(before.comentarios).toHaveLength(2);
    expect(before.reacoes).toHaveLength(1);
    expect(before.escutas).toHaveLength(1);

    const asAdmin = t.withIdentity({ subject: `${ids.userId}|s` });
    // @ts-ignore — TS2589 workaround for Convex generated API
    await asAdmin.mutation(api.gravacoes.mutations.remove, { id: ids.gravacaoId });

    // Everything deleted
    const after = await t.run(async (ctx) => ({
      gravacao: await ctx.db.get(ids.gravacaoId),
      comentarios: await ctx.db
        .query("comentariosGravacao")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", ids.gravacaoId))
        .collect(),
      reacoes: await ctx.db
        .query("reacoesGravacao")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", ids.gravacaoId))
        .collect(),
      escutas: await ctx.db
        .query("escutasGravacao")
        .withIndex("by_gravacao", (q) => q.eq("gravacaoId", ids.gravacaoId))
        .collect(),
    }));

    expect(after.gravacao).toBeNull();
    expect(after.comentarios).toHaveLength(0);
    expect(after.reacoes).toHaveLength(0);
    expect(after.escutas).toHaveLength(0);
  });

  it("remove gravação sem registros relacionados", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Membro",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
      const gravacaoId = await ctx.db.insert("gravacoes", {
        titulo: "Solo",
        tipo: "ESTUDO_BIBLICO",
        data: "2026-03-13",
        status: "PUBLICADO",
      });
      return { gravacaoId, userId };
    });

    const asUser = t.withIdentity({ subject: `${ids.userId}|s` });
    await asUser.mutation(api.gravacoes.mutations.remove, { id: ids.gravacaoId });

    const deleted = await t.run(async (ctx) => ctx.db.get(ids.gravacaoId));
    expect(deleted).toBeNull();
  });

  it("cria audit log DELETE ao remover gravação", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Admin",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
      const gravacaoId = await ctx.db.insert("gravacoes", {
        titulo: "Auditado",
        tipo: "SERMAO",
        data: "2026-03-13",
        status: "PUBLICADO",
      });
      return { gravacaoId, userId };
    });

    const asUser = t.withIdentity({ subject: `${ids.userId}|s` });
    await asUser.mutation(api.gravacoes.mutations.remove, { id: ids.gravacaoId });

    const logs = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_referencia", (q) =>
          q.eq("referenciaTabela", "gravacoes").eq("referenciaId", ids.gravacaoId)
        )
        .collect()
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "DELETE", referenciaTabela: "gravacoes" });
  });

  it("falha sem autenticação", async () => {
    const t = convexTest(schema, modules);
    const gravacaoId = await t.run(async (ctx) =>
      ctx.db.insert("gravacoes", {
        titulo: "X",
        tipo: "SERMAO",
        data: "2026-03-13",
        status: "RASCUNHO",
      })
    );
    await expect(
      t.mutation(api.gravacoes.mutations.remove, { id: gravacaoId })
    ).rejects.toThrow("Not authenticated");
  });

  it("falha quando gravação não existe", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Admin",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
      // Create and immediately delete to get a valid-format but nonexistent ID
      const tempId = await ctx.db.insert("gravacoes", {
        titulo: "Temp",
        tipo: "SERMAO",
        data: "2026-03-13",
        status: "RASCUNHO",
      });
      await ctx.db.delete(tempId);
      return { tempId, userId };
    });

    const asUser = t.withIdentity({ subject: `${ids.userId}|s` });
    await expect(
      asUser.mutation(api.gravacoes.mutations.remove, { id: ids.tempId })
    ).rejects.toThrow("Gravacao nao encontrada");
  });
});
