import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { MAX_FALHAS, JANELA_FALHAS_MS } from "../tentativas";

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
    dataNascimento?: string;
    status?: "ATIVO" | "INATIVO" | "TRANSFERIDO" | "FALECIDO" | "DESLIGADO";
  } = {}
) {
  return t.run(async (ctx) => {
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: over.status ?? "ATIVO",
      nomeCompleto: over.nome ?? "Fulano de Tal",
      whatsapp: over.whatsapp ?? "11999998888",
      cpf: over.cpf ?? "52998824725",
      ...(over.dataNascimento ? { dataNascimento: over.dataNascimento } : {}),
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
      papeis: [],
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

    const res = await t.mutation(api.membros.acesso.verificarAcessoDireto, {
      telefone: "11999998888",
      cpfPrefix: "52998",
    });
    expect(res.status).toBe("ok");
    const token = res.status === "ok" ? res.token : "";

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

  it("casa pelo telefone fixo quando nao ha whatsapp", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await t.run(async (ctx) => {
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "So Telefone",
        telefone: "1133224455", // sem whatsapp
        cpf: "52998824725",
      });
      const mId = await ctx.db.insert("membros", { entidadeId, role: "membro" });
      return { membroId: mId };
    });

    const res = await t.mutation(api.membros.acesso.verificarAcessoDireto, {
      telefone: "1133224455",
      cpfPrefix: "52998",
    });
    expect(res.status).toBe("ok");
    const token = res.status === "ok" ? res.token : "";
    expect(token).toBeTruthy();
    const convite = await t.run(async (ctx) =>
      ctx.db.query("membroConvites").withIndex("by_token", (q) => q.eq("token", token)).first()
    );
    expect(convite?.membroId).toBe(membroId);
  });

  it("rejeita CPF incorreto com mensagem generica", async () => {
    const t = convexTest(schema, modules);
    await seedMembroSemAcesso(t);

    const res = await t.mutation(api.membros.acesso.verificarAcessoDireto, {
      telefone: "11999998888",
      cpfPrefix: "00000",
    });
    expect(res).toEqual({ status: "nao_confere" });
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

    const res = await t.mutation(api.membros.acesso.verificarAcessoDireto, {
      telefone: "11999998888",
      cpfPrefix: "52998",
    });
    expect(res).toEqual({ status: "ja_ativado" });
  });

  describe("controle de tentativas", () => {
    const CERTO = { telefone: "11999998888", cpfPrefix: "52998" };
    const ERRADO = { telefone: "11999998888", cpfPrefix: "00000" };
    const verificar = (t: ReturnType<typeof convexTest>, args: typeof CERTO) =>
      t.mutation(api.membros.acesso.verificarAcessoDireto, args);
    const contarConvites = (t: ReturnType<typeof convexTest>) =>
      t.run(async (ctx) => (await ctx.db.query("membroConvites").collect()).length);
    const listarTentativas = (t: ReturnType<typeof convexTest>) =>
      t.run(async (ctx) => ctx.db.query("recuperacaoTentativas").collect());
    const envelhecerJanelas = (t: ReturnType<typeof convexTest>) =>
      t.run(async (ctx) => {
        for (const r of await ctx.db.query("recuperacaoTentativas").collect()) {
          await ctx.db.patch(r._id, { janelaInicio: Date.now() - JANELA_FALHAS_MS - 60_000 });
        }
      });

    it("bloqueia depois de erros repetidos, mesmo com os dados certos", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t);
      for (let i = 0; i < MAX_FALHAS; i++) {
        expect(await verificar(t, ERRADO)).toEqual({ status: "nao_confere" });
      }
      expect(await verificar(t, CERTO)).toEqual({ status: "bloqueado" });
      expect(await contarConvites(t)).toBe(0);
    });

    it("libera de novo quando a janela vence", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t);
      for (let i = 0; i < MAX_FALHAS; i++) await verificar(t, ERRADO);
      await envelhecerJanelas(t);
      const res = await verificar(t, CERTO);
      expect(res.status).toBe("ok");
    });

    it("zera os contadores do fluxo no acerto", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t);
      for (let i = 0; i < MAX_FALHAS - 1; i++) {
        await verificar(t, { telefone: CERTO.telefone, cpfPrefix: `0000${i}` });
      }
      expect((await verificar(t, CERTO)).status).toBe("ok");
      // Se o acerto nao zerasse o contador do telefone, esta falha o bloquearia
      await verificar(t, { telefone: CERTO.telefone, cpfPrefix: "00009" });
      expect((await verificar(t, CERTO)).status).toBe("ok");
    });

    it("acumula quando so um dos dados muda entre as tentativas", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t);
      // Telefone variando, prefixo fixo
      for (let i = 0; i < MAX_FALHAS; i++) {
        await verificar(t, { telefone: `1190000000${i}`, cpfPrefix: "52998" });
      }
      expect(await verificar(t, CERTO)).toEqual({ status: "bloqueado" });
    });

    it("acumula quando o prefixo varia e o telefone e fixo", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t);
      for (let i = 0; i < MAX_FALHAS; i++) {
        await verificar(t, { telefone: "11999998888", cpfPrefix: `0000${i}` });
      }
      expect(await verificar(t, CERTO)).toEqual({ status: "bloqueado" });
    });

    it("acumula quando o mesmo telefone vem em formatos diferentes", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t);
      const formatos = ["11999998888", "(11) 99999-8888", "+55 11 99999-8888", "11 99999 8888", "5511999998888"];
      for (let i = 0; i < MAX_FALHAS; i++) {
        await verificar(t, { telefone: formatos[i % formatos.length], cpfPrefix: "00000" });
      }
      expect(await verificar(t, CERTO)).toEqual({ status: "bloqueado" });
    });

    it.each([
      ["com membro vinculado", true],
      ["sem membro vinculado", false],
    ])("retorna inativo com dados certos e cadastro nao ativo, %s", async (_, comMembro) => {
      const t = convexTest(schema, modules);
      if (comMembro) {
        await seedMembroSemAcesso(t, { status: "INATIVO" });
      } else {
        await t.run(async (ctx) => {
          await ctx.db.insert("entidades", {
            tipoEntidade: "PF",
            papeis: [],
            status: "INATIVO",
            nomeCompleto: "Sem Membro",
            whatsapp: "11999998888",
            cpf: "52998824725",
          });
        });
      }
      expect(await verificar(t, CERTO)).toEqual({ status: "inativo" });
      expect(await contarConvites(t)).toBe(0);
    });

    it("os dois fluxos nao interferem um no outro", async () => {
      const t = convexTest(schema, modules);
      await seedMembroSemAcesso(t, { dataNascimento: "1980-05-20" });
      const recuperar = (over: { cpf?: string } = {}) =>
        t.mutation(api.membros.recuperarSenha.solicitarRecuperacao, {
          telefone: "11999998888",
          cpf: "529.988.247-25",
          dataNascimento: "1980-05-20",
          ...over,
        });

      // Falhas do primeiro acesso nao bloqueiam a recuperacao
      for (let i = 0; i < MAX_FALHAS; i++) await verificar(t, ERRADO);
      expect(await verificar(t, CERTO)).toEqual({ status: "bloqueado" });
      expect(await recuperar()).toEqual({ status: "primeiro_acesso" });

      // Falhas da recuperacao nao bloqueiam o primeiro acesso e seus registros ficam
      const t2 = convexTest(schema, modules);
      await seedMembroSemAcesso(t2, { dataNascimento: "1980-05-20" });
      const recuperar2 = (cpf: string) =>
        t2.mutation(api.membros.recuperarSenha.solicitarRecuperacao, {
          telefone: "11999998888",
          cpf,
          dataNascimento: "1980-05-20",
        });
      for (let i = 0; i < MAX_FALHAS; i++) await recuperar2("111.444.777-35");
      expect(await recuperar2("529.988.247-25")).toEqual({ status: "bloqueado" });
      const antes = (await listarTentativas(t2)).length;
      expect((await verificar(t2, CERTO)).status).toBe("ok");
      expect(await listarTentativas(t2)).toHaveLength(antes);
    });
  });
});

describe("acesso — resetarAcesso", () => {
  it("desvincula userId e remove a conta de login", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedAdmin(t);
    const { membroId } = await seedMembroSemAcesso(t);

    // simula ativado: cria user + authAccount + vincula
    const userId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {});
      await ctx.db.insert("authAccounts", {
        userId: uid,
        provider: "password",
        providerAccountId: "5511999998888@membro.local",
      });
      await ctx.db.patch(membroId, { userId: uid, onboardingCompleto: true });
      return uid;
    });

    await identity.mutation(api.membros.acesso.resetarAcesso, { membroId });

    const { membro, contas } = await t.run(async (ctx) => {
      const m = await ctx.db.get(membroId);
      const all = await ctx.db.query("authAccounts").collect();
      return { membro: m, contas: all.filter((a) => a.userId === userId) };
    });
    expect(membro?.userId).toBeUndefined();
    expect(contas).toHaveLength(0);
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

  it("e idempotente para o mesmo usuario e a pagina passa a ver ja_ativado", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);
    const { identity } = await seedUser(t);

    const token = "tok-idem";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId,
        origem: "link",
      })
    );

    await identity.mutation(api.membros.acesso.concluirAtivacao, { token });
    const again = await identity.mutation(api.membros.acesso.concluirAtivacao, { token });
    expect(again.ok).toBe(true);

    const res = await t.query(api.membros.acesso.getAtivacaoByToken, { token });
    expect(res.status).toBe("ja_ativado");
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
    ).rejects.toMatchObject({
      name: "ConvexError",
      data: expect.stringContaining("Este link expirou. Peca um novo a secretaria."),
    });
  });

  it("rejeita cadastro que nao esta ativo com orientacao", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t, { status: "INATIVO" });
    const { identity } = await seedUser(t);

    const token = "tok-inativo";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId,
        origem: "link",
      })
    );

    await expect(
      identity.mutation(api.membros.acesso.concluirAtivacao, { token })
    ).rejects.toMatchObject({
      name: "ConvexError",
      data: expect.stringContaining("Cadastro nao esta ativo. Procure a secretaria."),
    });
  });

  it("rejeita conta ja vinculada a outro cadastro com orientacao", async () => {
    const t = convexTest(schema, modules);
    const { membroId } = await seedMembroSemAcesso(t);
    const { membroId: outroMembroId } = await seedMembroSemAcesso(t, {
      whatsapp: "11988887777",
      cpf: "11144477735",
    });
    const { userId, identity } = await seedUser(t);
    await t.run(async (ctx) => ctx.db.patch(outroMembroId, { userId }));

    const token = "tok-vinculado";
    await t.run(async (ctx) =>
      ctx.db.insert("membroConvites", {
        token,
        status: "PENDENTE",
        expiraEm: Date.now() + 60_000,
        membroId,
        origem: "link",
      })
    );

    await expect(
      identity.mutation(api.membros.acesso.concluirAtivacao, { token })
    ).rejects.toMatchObject({
      name: "ConvexError",
      data: expect.stringContaining("Esta conta ja esta vinculada a outro cadastro. Procure a secretaria."),
    });
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
