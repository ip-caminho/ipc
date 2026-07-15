import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, seedUserSemMembro, as } from "./helpers";

// generateInvite define o `role` do membro criado depois por acceptInvite.
// Antes, exigia apenas login — qualquer usuario autenticado (inclusive um sem
// membro, recem-criado pelo OTP) conseguia emitir convite com papel admin e,
// via autoLink por telefone, assumir esse membro. Agora exige "membros:create"
// e mantem a guarda de papel admin de membros/mutations.create.

describe("membros.convites.generateInvite — exige permissao", () => {
  it("sem autenticacao: recusa", async () => {
    const t = convexTest(schema, modules);
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      t.mutation(api.membros.convites.generateInvite, { role: "admin" })
    ).rejects.toThrow();
  });

  it("autenticado sem membro nao emite convite admin (escalada bloqueada)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserSemMembro(t);
    await expect(
      as(t, userId).mutation(api.membros.convites.generateInvite, { role: "admin" })
    ).rejects.toThrow();
  });

  it("membro comum (sem membros:create): recusa", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    await expect(
      as(t, userId).mutation(api.membros.convites.generateInvite, { role: "admin" })
    ).rejects.toThrow();
  });

  it("quem tem membros:create nao pode convidar com papel admin", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["membros:create"],
    });
    await expect(
      as(t, userId).mutation(api.membros.convites.generateInvite, { role: "admin" })
    ).rejects.toThrow();
  });

  it("quem tem membros:create convida membro comum (sem regressao)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      role: "secretaria",
      permissions: ["membros:create"],
    });
    const token = await as(t, userId).mutation(api.membros.convites.generateInvite, {
      role: "membro",
    });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("admin convida com papel admin (fluxo legitimo de /admin/permissoes)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "admin" });
    const token = await as(t, userId).mutation(api.membros.convites.generateInvite, {
      role: "admin",
    });
    expect(typeof token).toBe("string");

    // o convite emitido guarda o papel e o autor
    const convite = await t.run(async (ctx) =>
      await ctx.db
        .query("membroConvites")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first()
    );
    expect(convite?.role).toBe("admin");
    expect(convite?.criadoPor).toBeDefined();
  });
});
