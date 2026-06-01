import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
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
  return t.withIdentity({ subject: `${userId}|session-1` });
}

async function seedMembro(
  t: ReturnType<typeof convexTest>,
  nome: string,
  opts: { ativado?: boolean; status?: "ATIVO" | "INATIVO" } = {}
) {
  return t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: opts.status ?? "ATIVO",
      nomeCompleto: nome,
      whatsapp: "11999990000",
      cpf: "52998824725",
    });
    let userId: Id<"users"> | undefined = undefined;
    if (opts.ativado) userId = await ctx.db.insert("users", {});
    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: "membro",
      userId,
      onboardingCompleto: opts.ativado ? true : undefined,
    });
    return membroId;
  });
}

describe("acesso — getAcessosOverview", () => {
  it("agrega status e contagens dos membros ATIVOS", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);

    // ativado (com login + convite aceito)
    const ativadoId = await seedMembro(t, "Ana Ativada", { ativado: true });
    await t.run(async (ctx) => {
      await ctx.db.insert("membroConvites", {
        token: "tk-a",
        status: "ACEITO",
        expiraEm: Date.now(),
        membroId: ativadoId,
        origem: "link",
      });
      await ctx.db.insert("auditLogs", {
        action: "LOGIN",
        referenciaTabela: "auth",
        referenciaId: "u1",
        membroId: ativadoId,
        field: "method",
        to: "password",
        createdAt: 1000,
      });
    });

    // pendente (link valido, sem userId)
    const pendenteId = await seedMembro(t, "Bruno Pendente");
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token: "tk-b",
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId: pendenteId,
        origem: "link",
      })
    );

    // sem acesso
    await seedMembro(t, "Carla Sem Acesso");
    // inativo (nao deve aparecer)
    await seedMembro(t, "Dario Inativo", { status: "INATIVO" });

    const res = await admin.query(api.membros.acesso.getAcessosOverview, {});

    // total = admin (ATIVO) + ana + bruno + carla = 4 (dario inativo fora)
    expect(res.resumo.total).toBe(4);
    expect(res.resumo.ativados).toBe(2); // admin + ana
    expect(res.resumo.pendentes).toBe(1); // bruno
    expect(res.resumo.semAcesso).toBe(1); // carla

    const ana = res.rows.find((r) => r.nome === "Ana Ativada");
    expect(ana?.ativado).toBe(true);
    expect(ana?.metodoAtivacao).toBe("link");
    expect(ana?.ultimoAcessoEm).toBe(1000);

    const nomes = res.rows.map((r) => r.nome);
    expect(nomes).not.toContain("Dario Inativo");
  });

  it("nega sem permissao membros:read", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const semPerm = t.withIdentity({ subject: `${userId}|s` });
    await expect(
      semPerm.query(api.membros.acesso.getAcessosOverview, {})
    ).rejects.toThrow();
  });
});

describe("acesso — getAtividadeMembro", () => {
  it("retorna logins + acoes principais em ordem decrescente", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    const membroId = await seedMembro(t, "Eva", { ativado: true });

    await t.run(async (ctx) => {
      await ctx.db.insert("auditLogs", {
        action: "LOGIN",
        referenciaTabela: "auth",
        referenciaId: "x",
        membroId,
        to: "password",
        createdAt: 100,
      });
      await ctx.db.insert("auditLogs", {
        action: "FIELD_CHANGE",
        referenciaTabela: "entidades",
        referenciaId: "e1",
        membroId,
        field: "email",
        to: "a@b.com",
        createdAt: 200,
      });
      // ruido: acao fora da allowlist
      await ctx.db.insert("auditLogs", {
        action: "INTERNAL_SYNC",
        referenciaTabela: "x",
        referenciaId: "y",
        membroId,
        createdAt: 300,
      });
    });

    const res = await admin.query(api.membros.acesso.getAtividadeMembro, { membroId });

    expect(res).toHaveLength(2); // INTERNAL_SYNC filtrado
    expect(res[0].em).toBe(200); // mais recente primeiro
    expect(res[0].action).toBe("FIELD_CHANGE");
    expect(res[0].field).toBe("email");
    expect(res[1].action).toBe("LOGIN");
    expect(res[1].valor).toBe("password");
  });
});
