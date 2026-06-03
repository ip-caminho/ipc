import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";

describe("gravacoes.update — sync de inicioConteudo", () => {
  it("ao editar inicioSermao/fimSermao, sincroniza inicioConteudo/fimConteudo", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));

    const gravacaoId = await t.run(async (ctx) =>
      ctx.db.insert("gravacoes", {
        titulo: "Sermao",
        tipo: "SERMAO",
        data: "2026-03-13",
        status: "PUBLICADO",
        // estado antigo: player usaria inicioConteudo=300
        inicioSermao: 300,
        inicioConteudo: 300,
        fimSermao: 1800,
        fimConteudo: 1800,
      })
    );

    const asUser = t.withIdentity({ subject: `${userId}|s` });
    await asUser.mutation(api.gravacoes.mutations.update, {
      id: gravacaoId,
      data: { inicioSermao: 120, fimSermao: 1700 },
    });

    const g = await t.run(async (ctx) => ctx.db.get(gravacaoId));
    expect(g?.inicioSermao).toBe(120);
    expect(g?.inicioConteudo).toBe(120); // sincronizado
    expect(g?.fimSermao).toBe(1700);
    expect(g?.fimConteudo).toBe(1700);
  });
});
