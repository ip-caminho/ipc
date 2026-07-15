import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, seedUserSemMembro, as } from "./helpers";

// As mutations de entidades exigiam apenas login. Como `update` recebe um patch
// livre (v.any()) e o campo `whatsapp` e o que autoLinkByPhone usa para casar
// entidade -> membro, qualquer usuario autenticado podia apontar para si o
// telefone de um membro privilegiado ainda nao ativado e assumir o papel dele.
// Agora cada mutation exige a permissao correspondente.

describe("entidades.mutations — exigem permissao", () => {
  it("create: sem autenticacao recusa", async () => {
    const t = convexTest(schema, modules);
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      t.mutation(api.entidades.mutations.create, {
        tipoEntidade: "PF",
        papeis: [],
        nomeCompleto: "Fulano",
      })
    ).rejects.toThrow();
  });

  it("create: membro sem entidades:create recusa", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.entidades.mutations.create, {
        tipoEntidade: "PF",
        papeis: [],
        nomeCompleto: "Fulano",
      })
    ).rejects.toThrow();
  });

  it("create: com entidades:create funciona (sem regressao em /entidades/novo)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["entidades:create"],
    });
    const id = await as(t, userId).mutation(api.entidades.mutations.create, {
      tipoEntidade: "PF",
      papeis: [],
      nomeCompleto: "Fulano",
    });
    expect(id).toBeDefined();
  });

  it("update: usuario sem entidades:update nao reescreve o whatsapp de outro (primitivo da escalada)", async () => {
    const t = convexTest(schema, modules);
    // Membro privilegiado ainda NAO ativado (userId ausente) — o alvo.
    const alvo = await t.run(async (ctx) => {
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Pastor Nao Ativado",
        whatsapp: "+5511900000000",
      });
      await ctx.db.insert("membros", { entidadeId, role: "pastor" });
      return entidadeId;
    });

    const atacante = await seedUserSemMembro(t);
    await expect(
      as(t, atacante).mutation(api.entidades.mutations.update, {
        id: alvo,
        data: { whatsapp: "+5511911111111" },
      })
    ).rejects.toThrow();

    // o telefone do alvo permanece intacto
    const depois = await t.run(async (ctx) => await ctx.db.get(alvo));
    expect(depois?.whatsapp).toBe("+5511900000000");
  });

  it("update: com entidades:update funciona", async () => {
    const t = convexTest(schema, modules);
    const alvo = await t.run(async (ctx) =>
      await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Beltrano",
      })
    );
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["entidades:update"],
    });
    await as(t, userId).mutation(api.entidades.mutations.update, {
      id: alvo,
      data: { nomeCompleto: "Beltrano Editado" },
    });
    const depois = await t.run(async (ctx) => await ctx.db.get(alvo));
    expect(depois?.nomeCompleto).toBe("Beltrano Editado");
  });

  it("updateStatus: membro comum recusa; com entidades:update funciona", async () => {
    const t = convexTest(schema, modules);
    const alvo = await t.run(async (ctx) =>
      await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Ciclano",
      })
    );

    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.entidades.mutations.updateStatus, {
        id: alvo,
        status: "DESLIGADO",
      })
    ).rejects.toThrow();

    const secretaria = await seedUser(t, {
      role: "secretaria",
      permissions: ["entidades:update"],
    });
    await as(t, secretaria).mutation(api.entidades.mutations.updateStatus, {
      id: alvo,
      status: "DESLIGADO",
    });
    const depois = await t.run(async (ctx) => await ctx.db.get(alvo));
    expect(depois?.status).toBe("DESLIGADO");
  });

  it("remove: usuario autenticado sem entidades:delete nao apaga cadastro", async () => {
    const t = convexTest(schema, modules);
    const alvo = await t.run(async (ctx) =>
      await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Nao Apagar",
      })
    );

    // entidades:update NAO basta para deletar
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["entidades:update"],
    });
    await expect(
      as(t, userId).mutation(api.entidades.mutations.remove, { id: alvo })
    ).rejects.toThrow();

    const ainda = await t.run(async (ctx) => await ctx.db.get(alvo));
    expect(ainda).not.toBeNull();
  });

  it("remove: com entidades:delete funciona", async () => {
    const t = convexTest(schema, modules);
    const alvo = await t.run(async (ctx) =>
      await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "ATIVO",
        nomeCompleto: "Apagar",
      })
    );
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["entidades:delete"],
    });
    await as(t, userId).mutation(api.entidades.mutations.remove, { id: alvo });
    const depois = await t.run(async (ctx) => await ctx.db.get(alvo));
    expect(depois).toBeNull();
  });
});
