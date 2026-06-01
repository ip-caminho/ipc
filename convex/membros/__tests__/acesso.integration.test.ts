import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

async function seedUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const identity = t.withIdentity({ subject: `${userId}|session-1` });
  return { userId, identity };
}

/** Cria um membro ATIVO sem acesso (sem userId). */
async function seedMembroSemAcesso(
  t: ReturnType<typeof convexTest>,
  over: {
    whatsapp?: string;
    cpf?: string;
    nome?: string;
    status?: "ATIVO" | "INATIVO" | "TRANSFERIDO" | "FALECIDO" | "DESLIGADO";
  } = {}
) {
  return t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: over.status ?? "ATIVO",
      nomeCompleto: over.nome ?? "Fulano de Tal",
      whatsapp: over.whatsapp ?? "11999998888",
      cpf: over.cpf ?? "52998824725",
    });
    const membroId = await ctx.db.insert("membros", { entidadeId, role: "membro" });
    return { entidadeId, membroId };
  });
}

/** Cria um admin vinculado para chamadas que exigem permissao. */
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

describe("acesso — verificarAcessoDireto", () => {
  it("gera token quando telefone + 5 digitos do CPF conferem", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);

    const { token } = await t.mutation(api.membros.acesso.verificarAcessoDireto, {
      telefone: "11999998888",
      cpfPrefix: "52998",
    });

    expect(token).toBeTruthy();
    const convite = await t.run(async (ctx) =>
      ctx.db
        .query("membroConvites")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first()
    );
    expect(convite?.membroId).toBe(membroId);
    expect(convite?.origem).toBe("direto");
    expect(convite?.status).toBe("PENDENTE");
  });

  it("rejeita CPF incorreto com mensagem generica", async () => {
    const t = convexTest(schema, modules);
    await seedMembroSemAcesso(t);

    await expect(
      t.mutation(api.membros.acesso.verificarAcessoDireto, {
        telefone: "11999998888",
        cpfPrefix: "00000",
      })
    ).rejects.toThrow("nao conferem");
  });

  it("rejeita prefixo com menos de 5 digitos", async () => {
    const t = convexTest(schema, modules);
    await seedMembroSemAcesso(t);

    await expect(
      t.mutation(api.membros.acesso.verificarAcessoDireto, {
        telefone: "11999998888",
        cpfPrefix: "529",
      })
    ).rejects.toThrow("5 primeiros");
  });

  it("bloqueia se o acesso ja foi ativado", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);
    const fakeUser = await t.run(async (ctx) => ctx.db.insert("users", {}));
    await t.run(async (ctx) => ctx.db.patch(membroId, { userId: fakeUser }));

    await expect(
      t.mutation(api.membros.acesso.verificarAcessoDireto, {
        telefone: "11999998888",
        cpfPrefix: "52998",
      })
    ).rejects.toThrow("ja ativado");
  });
});

describe("acesso — gerarLink", () => {
  it("admin gera link para membro existente", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedAdmin(t);
    const { membroId } = await seedMembroSemAcesso(t);

    const { token } = await identity.mutation(api.membros.acesso.gerarLink, { membroId });
    const convite = await t.run(async (ctx) =>
      ctx.db
        .query("membroConvites")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first()
    );
    expect(convite?.origem).toBe("link");
    expect(convite?.membroId).toBe(membroId);
    expect(convite!.expiraEm).toBeGreaterThan(Date.now());
  });

  it("nega para usuario sem permissao", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedUser(t); // sem membro/role
    const { membroId } = await seedMembroSemAcesso(t);

    await expect(
      identity.mutation(api.membros.acesso.gerarLink, { membroId })
    ).rejects.toThrow();
  });
});

describe("acesso — concluirAtivacao", () => {
  it("vincula userId ao membro e forca confirmacao de dados", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);
    const { userId, identity } = await seedUser(t);

    const token = "tok-test-1234";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId,
        origem: "link",
      })
    );

    const res = await identity.mutation(api.membros.acesso.concluirAtivacao, { token });
    expect(res.ok).toBe(true);

    const membro = await t.run(async (ctx) => ctx.db.get(membroId));
    expect(membro?.userId).toBe(userId);
    expect(membro?.onboardingCompleto).toBe(false);

    const convite = await t.run(async (ctx) =>
      ctx.db
        .query("membroConvites")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first()
    );
    expect(convite?.status).toBe("ACEITO");
  });

  it("rejeita token expirado", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);
    const { identity } = await seedUser(t);

    const token = "tok-exp";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() - 1000,
        membroId,
        origem: "link",
      })
    );

    await expect(
      identity.mutation(api.membros.acesso.concluirAtivacao, { token })
    ).rejects.toThrow("expirado");
  });
});

describe("acesso — getAtivacaoByToken", () => {
  it("retorna dados validos com loginId derivado do telefone", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t, { nome: "Maria Souza" });

    const token = "tok-valido";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId,
        origem: "link",
      })
    );

    const res = await t.query(api.membros.acesso.getAtivacaoByToken, { token });
    expect(res.status).toBe("valido");
    if (res.status === "valido") {
      expect(res.nome).toBe("Maria Souza");
      expect(res.loginId).toBe("5511999998888@membro.local");
    }
  });

  it("retorna ja_ativado quando membro ja tem userId", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);
    const fakeUser = await t.run(async (ctx) => ctx.db.insert("users", {}));
    await t.run(async (ctx) => ctx.db.patch(membroId, { userId: fakeUser }));

    const token = "tok-ja";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId,
        origem: "link",
      })
    );

    const res = await t.query(api.membros.acesso.getAtivacaoByToken, { token });
    expect(res.status).toBe("ja_ativado");
  });
});
