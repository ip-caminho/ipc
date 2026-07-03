import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

/** Helper: create a real user and return userId + identity helper */
async function seedUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const identity = t.withIdentity({ subject: `${userId}|session-1` });
  return { userId, identity };
}

/** Helper: user + membro admin (mutations exigem permissao; admin tem "*") */
async function seedAdmin(t: ReturnType<typeof convexTest>) {
  const { userId, identity } = await seedUser(t);
  await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: "Admin",
    });
    await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
  });
  return { userId, identity };
}

describe("membros — criação atômica", () => {
  it("cria entidade + membro na mesma mutation", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedAdmin(t);

    // @ts-ignore Convex TS2589
    const membroId = await identity.mutation(api.membros.mutations.create, {
      nomeCompleto: "João da Silva",
      cpf: "529.982.247-25",
      sexo: "M",
      role: "membro",
      dataMembresia: "2026-01-15",
      formaAdmissao: "PROFISSAO_FE",
    });

    const result = await t.run(async (ctx) => {
      const membro = await ctx.db.get(membroId);
      const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
      return { membro, entidade };
    });

    expect(result.membro).toMatchObject({
      role: "membro",
      dataMembresia: "2026-01-15",
      formaAdmissao: "PROFISSAO_FE",
    });
    expect(result.entidade).toMatchObject({
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: "João da Silva",
      cpf: "529.982.247-25",
      sexo: "M",
    });
  });

  it("usa role padrão 'membro' quando não especificado", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedAdmin(t);

    const membroId = await identity.mutation(api.membros.mutations.create, {
      nomeCompleto: "Maria Santos",
    });

    const membro = await t.run(async (ctx) => ctx.db.get(membroId));
    expect(membro?.role).toBe("membro");
  });

  it("bloqueia criação sem membros:create", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedUser(t);
    // membro comum, sem snapshot de permissoes nem row de rolePermissions
    await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Comum",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });

    await expect(
      identity.mutation(api.membros.mutations.create, { nomeCompleto: "Novo" })
    ).rejects.toThrow("Sem permissao");
  });

  it("bloqueia não-admin de criar membro com papel admin", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedUser(t);
    // secretaria com membros:create via snapshot, mas nao e admin
    await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Secretaria",
      });
      await ctx.db.insert("membros", {
        entidadeId: eid,
        role: "secretaria",
        userId,
        permissions: ["membros:create"],
      });
    });

    await expect(
      identity.mutation(api.membros.mutations.create, {
        nomeCompleto: "Golpe",
        role: "admin",
      })
    ).rejects.toThrow("Somente admin");
  });

  it("cria audit log de criação", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t);

    // Create a membro linked to the user (needed for audit actor)
    await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Admin",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "admin", userId });
    });

    const asAdmin = t.withIdentity({ subject: `${userId}|session-1` });
    const membroId = await asAdmin.mutation(api.membros.mutations.create, {
      nomeCompleto: "Novo Membro",
    });

    const logs = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_referencia", (q) =>
          q.eq("referenciaTabela", "membros").eq("referenciaId", membroId)
        )
        .collect()
    );

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: "CREATE", referenciaTabela: "membros" });
  });

  it("falha sem autenticação", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.membros.mutations.create, { nomeCompleto: "Hacker" })
    ).rejects.toThrow("Not authenticated");
  });
});

describe("membros — update", () => {
  it("atualiza dados da entidade e cria audit logs", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t);

    const ids = await t.run(async (ctx) => {
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "João Antigo",
      });
      const membroId = await ctx.db.insert("membros", {
        entidadeId,
        role: "admin",
        userId,
      });
      return { membroId, entidadeId };
    });

    const asAdmin = t.withIdentity({ subject: `${userId}|session-1` });
    await asAdmin.mutation(api.membros.mutations.update, {
      id: ids.membroId,
      entidadeData: { nomeCompleto: "João Novo" },
    });

    const entidade = await t.run(async (ctx) => ctx.db.get(ids.entidadeId));
    expect(entidade?.nomeCompleto).toBe("João Novo");

    const logs = await t.run(async (ctx) => ctx.db.query("auditLogs").collect());
    const fieldChanges = logs.filter((l) => l.action === "FIELD_CHANGE");
    expect(fieldChanges.length).toBeGreaterThanOrEqual(1);
    expect(fieldChanges[0]).toMatchObject({
      field: "nomeCompleto",
      from: "João Antigo",
      to: "João Novo",
    });
  });

  it("atualiza dados do membro (admin, sem role)", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedAdmin(t);

    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Membro",
      });
      return await ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });

    await identity.mutation(api.membros.mutations.update, {
      id: membroId,
      membroData: { dataMembresia: "2026-02-01" },
    });

    const membro = await t.run(async (ctx) => ctx.db.get(membroId));
    expect(membro?.dataMembresia).toBe("2026-02-01");
  });

  it("bloqueia troca de role via update (mesmo admin)", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedAdmin(t);

    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Membro",
      });
      return await ctx.db.insert("membros", { entidadeId: eid, role: "membro" });
    });

    await expect(
      identity.mutation(api.membros.mutations.update, {
        id: membroId,
        membroData: { role: "admin" },
      })
    ).rejects.toThrow("Permissoes");
  });

  it("bloqueia membro comum de editar (auto-escalação)", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedUser(t);

    const membroId = await t.run(async (ctx) => {
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Membro",
      });
      return await ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId });
    });

    await expect(
      identity.mutation(api.membros.mutations.update, {
        id: membroId,
        membroData: { role: "secretaria" },
      })
    ).rejects.toThrow("Sem permissao");
  });
});

describe("membros — updateStatus", () => {
  it("altera status da entidade via membro", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUser(t);

    const ids = await t.run(async (ctx) => {
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: "ATIVO",
        nomeCompleto: "Membro Transferido",
      });
      const membroId = await ctx.db.insert("membros", {
        entidadeId,
        role: "admin",
        userId,
      });
      return { membroId, entidadeId };
    });

    const asAdmin = t.withIdentity({ subject: `${userId}|session-1` });
    await asAdmin.mutation(api.membros.mutations.updateStatus, {
      id: ids.membroId,
      status: "TRANSFERIDO",
    });

    const entidade = await t.run(async (ctx) => ctx.db.get(ids.entidadeId));
    expect(entidade?.status).toBe("TRANSFERIDO");
  });
});
