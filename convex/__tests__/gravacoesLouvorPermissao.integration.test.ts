import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";

// As mutations de gravacoes e louvor exigiam apenas login. Como o papel base
// "membro" so tem gravacoes:read/louvor:read, qualquer membro logado criava,
// editava, publicava e APAGAVA (incluindo o audio no B2) qualquer gravacao ou
// louvor chamando a API direto — a UI ja escondia os botoes por permissao, mas
// o backend nao checava. Agora cada mutation exige a permissao nomeada.

const gravacaoBase = {
  titulo: "Sermao",
  tipo: "SERMAO" as const,
  data: "2026-07-15",
};

async function seedGravacao(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("gravacoes", { ...gravacaoBase, status: "RASCUNHO" })
  );
}

async function seedLouvor(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("louvores", {
      titulo: "Hino",
      status: "ATIVO",
      criadoEm: 1,
    })
  );
}

describe("gravacoes.mutations — exigem permissao", () => {
  it("create: membro comum recusa", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      as(t, userId).mutation(api.gravacoes.mutations.create, gravacaoBase)
    ).rejects.toThrow();
  });

  it("create: com gravacoes:create funciona", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["gravacoes:create"],
    });
    const id = await as(t, userId).mutation(
      api.gravacoes.mutations.create,
      gravacaoBase
    );
    expect(id).toBeDefined();
  });

  it("update: membro comum nao edita", async () => {
    const t = convexTest(schema, modules);
    const id = await seedGravacao(t);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.gravacoes.mutations.update, {
        id,
        data: { titulo: "Hackeado" },
      })
    ).rejects.toThrow();
    const doc = await t.run(async (ctx) => await ctx.db.get(id));
    expect(doc?.titulo).toBe("Sermao");
  });

  it("publish: exige gravacoes:update (nao basta estar logado)", async () => {
    const t = convexTest(schema, modules);
    const id = await seedGravacao(t);

    const comum = await seedUser(t, { role: "membro" });
    await expect(
      as(t, comum).mutation(api.gravacoes.mutations.publish, { id })
    ).rejects.toThrow();

    const editor = await seedUser(t, {
      role: "secretaria",
      permissions: ["gravacoes:update"],
    });
    await as(t, editor).mutation(api.gravacoes.mutations.publish, { id });
    const doc = await t.run(async (ctx) => await ctx.db.get(id));
    expect(doc?.status).toBe("PUBLICADO");
  });

  it("remove: gravacoes:update NAO basta; exige gravacoes:delete", async () => {
    const t = convexTest(schema, modules);
    const id = await seedGravacao(t);

    const editor = await seedUser(t, {
      role: "secretaria",
      permissions: ["gravacoes:update"],
    });
    await expect(
      as(t, editor).mutation(api.gravacoes.mutations.remove, { id })
    ).rejects.toThrow();
    expect(await t.run(async (ctx) => await ctx.db.get(id))).not.toBeNull();

    const deleter = await seedUser(t, {
      role: "secretaria",
      permissions: ["gravacoes:delete"],
    });
    await as(t, deleter).mutation(api.gravacoes.mutations.remove, { id });
    expect(await t.run(async (ctx) => await ctx.db.get(id))).toBeNull();
  });
});

describe("gravacoes.ai — createFrom* exigem o mesmo gate pago de startProcessing", () => {
  it("createFromAudio: membro comum recusa (pipeline Deepgram+Claude)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.gravacoes.ai.createFromAudio, {
        audioUrl: "https://cdn.yhc.com.br/x.mp3",
      })
    ).rejects.toThrow();
  });

  it("createFromAudio: gravacoes:create NAO basta; exige gravacoes:process_ai", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["gravacoes:create"],
    });
    await expect(
      as(t, userId).mutation(api.gravacoes.ai.createFromAudio, {
        audioUrl: "https://cdn.yhc.com.br/x.mp3",
      })
    ).rejects.toThrow();
  });

  it("createFromYouTube: membro comum recusa", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.gravacoes.ai.createFromYouTube, {
        youtubeUrl: "https://youtu.be/x",
      })
    ).rejects.toThrow();
  });

  it("createFromAudio: com gravacoes:process_ai funciona (sem regressao)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["gravacoes:process_ai"],
    });
    const id = await as(t, userId).mutation(api.gravacoes.ai.createFromAudio, {
      audioUrl: "https://cdn.yhc.com.br/x.mp3",
    });
    expect(id).toBeDefined();
  });
});

describe("louvor.mutations — exigem permissao", () => {
  it("create: membro comum recusa", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.louvor.mutations.create, { titulo: "Novo" })
    ).rejects.toThrow();
  });

  it("create: com louvor:create funciona", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["louvor:create"],
    });
    const id = await as(t, userId).mutation(api.louvor.mutations.create, {
      titulo: "Novo",
    });
    expect(id).toBeDefined();
  });

  it("update: membro comum nao edita", async () => {
    const t = convexTest(schema, modules);
    const id = await seedLouvor(t);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.louvor.mutations.update, {
        id,
        data: { titulo: "Hackeado" },
      })
    ).rejects.toThrow();
    const doc = await t.run(async (ctx) => await ctx.db.get(id));
    expect(doc?.titulo).toBe("Hino");
  });

  it("remove: louvor:update NAO basta; exige louvor:delete", async () => {
    const t = convexTest(schema, modules);
    const id = await seedLouvor(t);

    const editor = await seedUser(t, {
      role: "secretaria",
      permissions: ["louvor:update"],
    });
    await expect(
      as(t, editor).mutation(api.louvor.mutations.remove, { id })
    ).rejects.toThrow();
    expect(await t.run(async (ctx) => await ctx.db.get(id))).not.toBeNull();

    const deleter = await seedUser(t, {
      role: "secretaria",
      permissions: ["louvor:delete"],
    });
    await as(t, deleter).mutation(api.louvor.mutations.remove, { id });
    expect(await t.run(async (ctx) => await ctx.db.get(id))).toBeNull();
  });
});
