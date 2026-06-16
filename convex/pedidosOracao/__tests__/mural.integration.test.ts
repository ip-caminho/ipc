import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";

type T = ReturnType<typeof convexTest>;

async function seedMembro(t: T, role: string, nome: string) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const membroId = await t.run(async (ctx) => {
    const eid = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
      status: "ATIVO",
      nomeCompleto: nome,
    });
    return ctx.db.insert("membros", { entidadeId: eid, role, userId });
  });
  return { ctx: t.withIdentity({ subject: `${userId}|s` }), membroId };
}

async function seedPedido(
  t: T,
  membroId: Id<"membros">,
  extra: Record<string, unknown>,
) {
  return t.run(async (ctx) =>
    ctx.db.insert("pedidosOracao", {
      membroId,
      descricao: "Pedido de teste do mural",
      status: "ATIVO",
      qtdOrando: 0,
      criadoEm: 1,
      ...extra,
    }),
  );
}

const ids = (arr: { _id: string }[]) => new Set(arr.map((p) => p._id));

describe("listMuralRequests — visibilidade por scope", () => {
  it("respeita private/church/leaders/pg, ARQUIVADO, legado e anonimo", async () => {
    const t = convexTest(schema, modules);
    const lider = await seedMembro(t, "admin", "Lider");
    const autor = await seedMembro(t, "membro", "Autor");
    const noPg = await seedMembro(t, "membro", "MembroPG");
    const foraPg = await seedMembro(t, "membro", "ForaPG");

    // PG1 com noPg como membro
    const pg1 = await t.run(async (ctx) =>
      ctx.db.insert("pequenosGrupos", {
        nome: "PG1",
        liderId: lider.membroId,
        status: "ATIVO",
      }),
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("pgMembros", { pgId: pg1, membroId: noPg.membroId });
    });

    const pPrivate = await seedPedido(t, autor.membroId, { scope: "private" });
    const pChurch = await seedPedido(t, autor.membroId, { scope: "church" });
    const pLeaders = await seedPedido(t, autor.membroId, { scope: "leaders" });
    const pPg = await seedPedido(t, autor.membroId, { scope: "pg", pgId: pg1 });
    const pLegacy = await seedPedido(t, autor.membroId, { compartilhadoIgreja: true }); // legado -> church
    const pArquivado = await seedPedido(t, autor.membroId, { scope: "church", status: "ARQUIVADO" });
    const pAnon = await seedPedido(t, autor.membroId, { scope: "church", anonimo: true });

    // ForaPG (membro comum, fora do PG): church + legado + anon. NUNCA private/leaders/pg/arquivado.
    const visForaPg = ids(await foraPg.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}));
    expect(visForaPg).toEqual(new Set([pChurch, pLegacy, pAnon]));
    expect(visForaPg.has(pPrivate)).toBe(false);
    expect(visForaPg.has(pLeaders)).toBe(false);
    expect(visForaPg.has(pPg)).toBe(false);
    expect(visForaPg.has(pArquivado)).toBe(false);

    // NoPg (membro do PG1): church + legado + anon + pg
    const visNoPg = ids(await noPg.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}));
    expect(visNoPg).toEqual(new Set([pChurch, pLegacy, pAnon, pPg]));
    expect(visNoPg.has(pLeaders)).toBe(false);

    // Lider: church + legado + anon + leaders + pg (e lider do PG1, entao
    // getPgIdsDoMembro inclui o PG1 e ele ve pedidos pg desse grupo)
    const visLider = ids(await lider.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}));
    expect(visLider).toEqual(new Set([pChurch, pLegacy, pAnon, pLeaders, pPg]));
    expect(visLider.has(pPrivate)).toBe(false);

    // Autor: ve os proprios nao-private e nao-arquivados (church/leaders/pg/legado/anon)
    const visAutor = ids(await autor.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}));
    expect(visAutor).toEqual(new Set([pChurch, pLeaders, pPg, pLegacy, pAnon]));
    expect(visAutor.has(pPrivate)).toBe(false);
    expect(visAutor.has(pArquivado)).toBe(false);
  });

  it("anonimo esconde o autor mas mantem isOwner para o dono", async () => {
    const t = convexTest(schema, modules);
    const autor = await seedMembro(t, "membro", "Autor");
    const outro = await seedMembro(t, "membro", "Outro");
    const pAnon = await seedPedido(t, autor.membroId, { scope: "church", anonimo: true });

    const doDono = (await autor.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}))
      .find((p) => p._id === pAnon)!;
    expect(doDono.autor).toBeNull();
    expect(doDono.isOwner).toBe(true);

    const deOutro = (await outro.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}))
      .find((p) => p._id === pAnon)!;
    expect(deOutro.autor).toBeNull();
    expect(deOutro.isOwner).toBe(false);
  });

  it("qtdOrando vem do campo denormalizado e euOrando reflete o toggle", async () => {
    const t = convexTest(schema, modules);
    const autor = await seedMembro(t, "membro", "Autor");
    const orante = await seedMembro(t, "membro", "Orante");
    const p = await seedPedido(t, autor.membroId, { scope: "church" });

    await orante.ctx.mutation(api.pedidosOracao.mutations.toggleOrando, { pedidoId: p });

    const visto = (await orante.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}))
      .find((x) => x._id === p)!;
    expect(visto.qtdOrando).toBe(1);
    expect(visto.euOrando).toBe(true);

    const vistoAutor = (await autor.ctx.query(api.pedidosOracao.queries.listMuralRequests, {}))
      .find((x) => x._id === p)!;
    expect(vistoAutor.qtdOrando).toBe(1);
    expect(vistoAutor.euOrando).toBe(false);
  });
});
