import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

async function seedUser(t: ReturnType<typeof convexTest>, role: string) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: role,
    });
    await ctx.db.insert("membros", { entidadeId: eid, role, userId });
  });
  return t.withIdentity({ subject: `${userId}|s` });
}

async function gravacao(t: ReturnType<typeof convexTest>, status: string) {
  return t.run(async (ctx) =>
    ctx.db.insert("gravacoes", {
      titulo: "Sermao X",
      tipo: "SERMAO",
      data: "2026-06-01",
      status,
      audioUrl: "https://cdn.yhc.com.br/gravacoes-audio/x.mp3",
    } as any)
  );
}

describe("compartilhar gravacao", () => {
  it("admin gera link de gravacao publicada; revoga; pagina publica valida", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, "admin");
    const gId = await gravacao(t, "PUBLICADO");

    const { token } = await admin.mutation(api.gravacoes.share.gerarShareLink, { gravacaoId: gId });
    expect(token).toBeTruthy();

    const pub = await t.query(api.gravacoes.share.getCompartilhada, { codigo: token });
    expect(pub.valido).toBe(true);
    expect(pub.valido && pub.gravacao.titulo).toBe("Sermao X");

    // Idempotente: gerar de novo retorna o mesmo token
    const again = await admin.mutation(api.gravacoes.share.gerarShareLink, { gravacaoId: gId });
    expect(again.token).toBe(token);

    // Revoga → pagina publica nega
    await admin.mutation(api.gravacoes.share.revogarShareLink, { gravacaoId: gId });
    const pub2 = await t.query(api.gravacoes.share.getCompartilhada, { codigo: token });
    expect(pub2.valido).toBe(false);
  });

  it("nao compartilha rascunho", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, "admin");
    const gId = await gravacao(t, "RASCUNHO");
    await expect(
      admin.mutation(api.gravacoes.share.gerarShareLink, { gravacaoId: gId })
    ).rejects.toThrow(/publicadas/i);
  });

  it("membro sem gravacoes:share nao gera link", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "admin"); // garante que ha sistema
    const membro = await seedUser(t, "membro");
    const gId = await gravacao(t, "PUBLICADO");
    await expect(
      membro.mutation(api.gravacoes.share.gerarShareLink, { gravacaoId: gId })
    ).rejects.toThrow();
    // getShareInfo retorna null (sem permissao)
    const info = await membro.query(api.gravacoes.share.getShareInfo, { gravacaoId: gId });
    expect(info).toBeNull();
  });
});
