import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

type T = ReturnType<typeof convexTest>;

const DADOS = {
  telefone: "11999998888",
  cpf: "529.988.247-25",
  dataNascimento: "1980-05-20",
};

async function seedMembro(
  t: T,
  over: {
    cpf?: string;
    dataNascimento?: string;
    status?: "ATIVO" | "INATIVO";
    role?: string;
    permissions?: string[];
    semAcesso?: boolean;
  } = {}
) {
  return t.run(async (ctx) => {
    const userId = over.semAcesso ? undefined : await ctx.db.insert("users", {});
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: over.status ?? "ATIVO",
      nomeCompleto: "Fulano de Tal",
      whatsapp: "(11) 99999-8888",
      cpf: over.cpf ?? "52998824725",
      dataNascimento: over.dataNascimento ?? "1980-05-20",
    });
    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: over.role ?? "membro",
      permissions: over.permissions,
      userId,
    });
    const contaId = userId
      ? await ctx.db.insert("authAccounts", {
          userId,
          provider: "password",
          providerAccountId: "5511999998888@membro.local",
          secret: "hash-antigo",
        })
      : undefined;
    return { userId, membroId, contaId };
  });
}

const solicitar = (t: T, over: Partial<typeof DADOS> = {}) =>
  t.mutation(api.membros.recuperarSenha.solicitarRecuperacao, {
    ...DADOS,
    ...over,
  });

describe("recuperarSenha — solicitarRecuperacao", () => {
  it("gera pedido quando telefone, CPF e nascimento conferem", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembro(t);

    const res = await solicitar(t);

    expect(res.status).toBe("ok");
    const pedidos = await t.run((ctx) => ctx.db.query("recuperacoesSenha").collect());
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].membroId).toBe(membroId);
  });

  it("encontra CPF gravado com mascara e nascimento em formato brasileiro", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t, { cpf: "529.988.247-25", dataNascimento: "20/05/1980" });

    const res = await solicitar(t, { cpf: "52998824725" });

    expect(res.status).toBe("ok");
  });

  it.each([
    ["telefone", { telefone: "11988887777" }],
    ["CPF", { cpf: "11144477735" }],
    ["nascimento", { dataNascimento: "1980-05-21" }],
  ])("recusa com %s errado, sem gerar pedido", async (_nome, over) => {
    const t = convexTest(schema, modules);
    await seedMembro(t);

    const res = await solicitar(t, over);

    expect(res.status).toBe("nao_confere");
    const pedidos = await t.run((ctx) => ctx.db.query("recuperacoesSenha").collect());
    expect(pedidos).toHaveLength(0);
  });

  it("bloqueia depois de 5 falhas, mesmo com os dados certos", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);

    for (let i = 0; i < 5; i++) {
      expect((await solicitar(t, { cpf: "11144477735" })).status).toBe("nao_confere");
    }

    expect((await solicitar(t)).status).toBe("bloqueado");
  });

  it("libera nova janela depois de 1 hora", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);
    for (let i = 0; i < 5; i++) await solicitar(t, { cpf: "11144477735" });

    await t.run(async (ctx) => {
      for (const tentativa of await ctx.db.query("recuperacaoTentativas").collect()) {
        await ctx.db.patch(tentativa._id, {
          janelaInicio: Date.now() - 61 * 60 * 1000,
        });
      }
    });

    expect((await solicitar(t)).status).toBe("ok");
  });

  it("bloqueia o CPF mesmo variando o telefone a cada tentativa", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);

    for (let i = 0; i < 5; i++) {
      const res = await solicitar(t, { telefone: `1190000000${i}` });
      expect(res.status).toBe("nao_confere");
    }

    expect((await solicitar(t)).status).toBe("bloqueado");
  });

  it("zera as falhas quando os dados conferem", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);
    await solicitar(t, { dataNascimento: "1980-05-21" });

    await solicitar(t);

    const tentativas = await t.run((ctx) =>
      ctx.db.query("recuperacaoTentativas").collect()
    );
    expect(tentativas).toHaveLength(0);
  });

  it.each([
    ["admin", { role: "admin" }],
    ["voluntario com permissoes", { permissions: ["biblioteca:manage"] }],
  ])("encaminha %s ao painel, sem gerar pedido", async (_nome, over) => {
    const t = convexTest(schema, modules);
    await seedMembro(t, over);

    expect((await solicitar(t)).status).toBe("procure_admin");
    const pedidos = await t.run((ctx) => ctx.db.query("recuperacoesSenha").collect());
    expect(pedidos).toHaveLength(0);
  });

  it("encaminha cadastro inativo a secretaria", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t, { status: "INATIVO" });

    expect((await solicitar(t)).status).toBe("procure_secretaria");
  });

  it("encaminha quem nunca ativou ao primeiro acesso", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t, { semAcesso: true });

    expect((await solicitar(t)).status).toBe("primeiro_acesso");
  });

  it("mantem apenas o pedido mais recente", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);

    const primeiro = await solicitar(t);
    const segundo = await solicitar(t);

    const pedidos = await t.run((ctx) => ctx.db.query("recuperacoesSenha").collect());
    expect(pedidos).toHaveLength(1);
    expect(primeiro.status === "ok" && segundo.status === "ok").toBe(true);
    if (segundo.status === "ok") expect(pedidos[0].token).toBe(segundo.token);
  });
});

describe("recuperarSenha — consumirToken", () => {
  async function pedidoValido(t: T) {
    const res = await solicitar(t);
    if (res.status !== "ok") throw new Error("pedido nao gerado");
    return res.token;
  }

  it("devolve a conta sem auditar nem liberar o login antes da troca", async () => {
    const t = convexTest(schema, modules);
    const { userId, membroId, contaId } = await seedMembro(t);
    await t.run((ctx) =>
      ctx.db.insert("authRateLimits", {
        identifier: contaId as string,
        lastAttemptTime: Date.now(),
        attemptsLeft: 0,
      })
    );

    const conta = await t.mutation(internal.membros.recuperarSenha.consumirToken, {
      token: await pedidoValido(t),
    });

    expect(conta).toEqual({
      userId,
      membroId,
      contaId,
      loginId: "5511999998888@membro.local",
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("authRateLimits").collect()).toHaveLength(1);
      expect(await ctx.db.query("auditLogs").collect()).toHaveLength(0);
    });
  });

  it("nao aceita o mesmo token duas vezes", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);
    const token = await pedidoValido(t);
    const consumir = internal.membros.recuperarSenha.consumirToken;

    expect(await t.mutation(consumir, { token })).not.toBeNull();
    expect(await t.mutation(consumir, { token })).toBeNull();
  });

  it("nao aceita token expirado", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);
    const token = await pedidoValido(t);
    await t.run(async (ctx) => {
      const [pedido] = await ctx.db.query("recuperacoesSenha").collect();
      await ctx.db.patch(pedido._id, { expiraEm: Date.now() - 1 });
    });

    expect(
      await t.mutation(internal.membros.recuperarSenha.consumirToken, { token })
    ).toBeNull();
  });

  it("recusa quem virou admin depois de abrir o pedido", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembro(t);
    const token = await pedidoValido(t);
    await t.run((ctx) => ctx.db.patch(membroId, { role: "admin" }));

    expect(
      await t.mutation(internal.membros.recuperarSenha.consumirToken, { token })
    ).toBeNull();
  });
});

describe("recuperarSenha — limparExpirados", () => {
  it("apaga so os registros vencidos", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembro(t);
    const agora = Date.now();
    const horaEMeia = 90 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("recuperacaoTentativas", {
        chave: "vencida",
        falhas: 5,
        janelaInicio: agora - horaEMeia,
      });
      await ctx.db.insert("recuperacaoTentativas", {
        chave: "aberta",
        falhas: 5,
        janelaInicio: agora,
      });
      await ctx.db.insert("recuperacoesSenha", {
        token: "vencido",
        membroId,
        expiraEm: agora - 1,
      });
      await ctx.db.insert("recuperacoesSenha", {
        token: "valido",
        membroId,
        expiraEm: agora + 60_000,
      });
    });

    await t.mutation(internal.membros.recuperarSenha.limparExpirados, {});

    await t.run(async (ctx) => {
      const tentativas = await ctx.db.query("recuperacaoTentativas").collect();
      const pedidos = await ctx.db.query("recuperacoesSenha").collect();
      expect(tentativas.map((r) => r.chave)).toEqual(["aberta"]);
      expect(pedidos.map((r) => r.token)).toEqual(["valido"]);
    });
  });
});

describe("recuperarSenha — redefinirSenha", () => {
  it("nao consome o token quando a senha e curta", async () => {
    const t = convexTest(schema, modules);
    await seedMembro(t);
    const res = await solicitar(t);
    if (res.status !== "ok") throw new Error("pedido nao gerado");

    const saida = await t.action(api.membros.recuperarSenha.redefinirSenha, {
      token: res.token,
      novaSenha: "curta",
    });

    expect(saida.status).toBe("senha_invalida");
    const [pedido] = await t.run((ctx) => ctx.db.query("recuperacoesSenha").collect());
    expect(pedido.usadoEm).toBeUndefined();
  });

  it("troca a senha, derruba as sessoes e impede reuso do token", async () => {
    const t = convexTest(schema, modules);
    const { userId, membroId, contaId } = await seedMembro(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("authSessions", {
        userId: userId!,
        expirationTime: Date.now() + 60_000,
      });
      await ctx.db.insert("authRateLimits", {
        identifier: contaId as string,
        lastAttemptTime: Date.now(),
        attemptsLeft: 0,
      });
    });
    const res = await solicitar(t);
    if (res.status !== "ok") throw new Error("pedido nao gerado");
    const redefinir = api.membros.recuperarSenha.redefinirSenha;

    const saida = await t.action(redefinir, {
      token: res.token,
      novaSenha: "senha-boa-123",
    });

    expect(saida).toEqual({ status: "ok", loginId: "5511999998888@membro.local" });
    await t.run(async (ctx) => {
      const conta = await ctx.db.get(contaId!);
      expect(conta?.secret).toBeTruthy();
      expect(conta?.secret).not.toBe("hash-antigo");
      expect(await ctx.db.query("authSessions").collect()).toHaveLength(0);
      expect(await ctx.db.query("authRateLimits").collect()).toHaveLength(0);
      const logs = await ctx.db.query("auditLogs").collect();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("PASSWORD_RESET");
      expect(logs[0].membroId).toBe(membroId);
    });
    expect(
      (await t.action(redefinir, { token: res.token, novaSenha: "outra-senha-456" })).status
    ).toBe("expirado");
  });

  it("recusa token inexistente", async () => {
    const t = convexTest(schema, modules);

    const saida = await t.action(api.membros.recuperarSenha.redefinirSenha, {
      token: "nao-existe",
      novaSenha: "senha-boa-123",
    });

    expect(saida.status).toBe("expirado");
  });
});
