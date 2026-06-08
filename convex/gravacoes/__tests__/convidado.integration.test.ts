import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
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
  return t.withIdentity({ subject: `${userId}|s` });
}

async function seedGravacaoPublicada(t: ReturnType<typeof convexTest>, titulo: string) {
  return t.run(async (ctx) =>
    ctx.db.insert("gravacoes", {
      titulo,
      tipo: "SERMAO",
      data: "2026-06-01",
      status: "PUBLICADO",
      audioUrl: "https://cdn.yhc.com.br/gravacoes-audio/x.mp3",
    } as any)
  );
}

describe("link de convidado", () => {
  it("codigo correto lista publicadas; errado/ausente nega", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await seedGravacaoPublicada(t, "Sermao Publicado");
    // rascunho nao deve aparecer
    await t.run(async (ctx) =>
      ctx.db.insert("gravacoes", {
        titulo: "Rascunho",
        tipo: "SERMAO",
        data: "2026-06-02",
        status: "RASCUNHO",
      } as any)
    );
    // estudo biblico publicado NAO deve aparecer (so pregacoes)
    await t.run(async (ctx) =>
      ctx.db.insert("gravacoes", {
        titulo: "Estudo Publicado",
        tipo: "ESTUDO_BIBLICO",
        data: "2026-06-03",
        status: "PUBLICADO",
        audioUrl: "https://cdn.yhc.com.br/gravacoes-audio/e.mp3",
      } as any)
    );

    // Sem token configurado → nega
    const semToken = await t.query(api.gravacoes.publico.listConvidado, { codigo: "qualquer" });
    expect(semToken.valido).toBe(false);

    // Admin gera o token
    const { token } = await admin.mutation(api.appConfig.mutations.gerarTokenConvidado, {});
    expect(token).toBeTruthy();

    // Codigo errado → nega
    const errado = await t.query(api.gravacoes.publico.listConvidado, { codigo: "errado" });
    expect(errado.valido).toBe(false);

    // Codigo certo → lista so as publicadas
    const ok = await t.query(api.gravacoes.publico.listConvidado, { codigo: token });
    expect(ok.valido).toBe(true);
    expect(ok.gravacoes.map((g: any) => g.titulo)).toEqual(["Sermao Publicado"]);

    // Revogar → nega de novo
    await admin.mutation(api.appConfig.mutations.revogarTokenConvidado, {});
    const revogado = await t.query(api.gravacoes.publico.listConvidado, { codigo: token });
    expect(revogado.valido).toBe(false);
  });

  it("query publica de config nao expoe o token", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedAdmin(t);
    await admin.mutation(api.appConfig.mutations.gerarTokenConvidado, {});

    const cfg = await t.query(api.appConfig.queries.get, {});
    expect(cfg).not.toHaveProperty("convidadoToken");
  });
});
