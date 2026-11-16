import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { as, seedUser, seedUserComMembro } from "./helpers";

type T = ReturnType<typeof convexTest>;

async function seedRolePerms(t: T, role: string, permissions: string[]) {
  await t.run(async (ctx) => {
    await ctx.db.insert("rolePermissions", { role, permissions, updatedAt: Date.now() });
  });
}

async function seedGravacao(t: T) {
  return t.run(async (ctx) =>
    ctx.db.insert("gravacoes", {
      titulo: "Sermao X",
      tipo: "SERMAO",
      data: "2026-06-01",
      status: "PUBLICADO",
      audioUrl: "https://cdn.yhc.com.br/gravacoes-audio/x.mp3",
    } as any)
  );
}

describe("obreiro herda o papel membro — gate de gravações (ponto 1)", () => {
  it("G1: obreiro sem nenhuma linha no banco acessa a gravação", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "obreiro" });
    const gId = await seedGravacao(t);

    const g = await as(t, userId).query(api.gravacoes.queries.getById, { id: gId });
    expect(g?._id).toBe(gId);
    const lista = await as(t, userId).query(api.gravacoes.queries.list, {});
    expect(lista.map((x: { _id: string }) => x._id)).toContain(gId);
  });

  it("G2: linha do obreiro sem gravacoes:read + linha do membro com ela", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "obreiro" });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read"]);
    const gId = await seedGravacao(t);

    const g = await as(t, userId).query(api.gravacoes.queries.getById, { id: gId });
    expect(g?._id).toBe(gId);
  });

  it("G3: obreiro com snapshot continua herdando", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "obreiro", permissions: ["tarefas:read"] });
    await seedRolePerms(t, "membro", ["gravacoes:read"]);
    const gId = await seedGravacao(t);

    const g = await as(t, userId).query(api.gravacoes.queries.getById, { id: gId });
    expect(g?._id).toBe(gId);
  });

  it("G4: a herança segue o banco, não a constante", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "obreiro" });
    const adminId = await seedUser(t, { role: "admin" });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "membro", ["membros:self_service"]);
    const gId = await seedGravacao(t);

    await expect(
      as(t, userId).query(api.gravacoes.queries.getById, { id: gId })
    ).rejects.toThrow(/Sem permissao/);
    expect(await as(t, userId).query(api.gravacoes.queries.list, {})).toEqual([]);

    await as(t, adminId).mutation(api.preferencias.rbac.updateRolePermissions, {
      role: "membro",
      permissions: ["membros:self_service", "gravacoes:read"],
    });
    const g = await as(t, userId).query(api.gravacoes.queries.getById, { id: gId });
    expect(g?._id).toBe(gId);
  });

  it("G5: presbitero não herda", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "presbitero" });
    await seedRolePerms(t, "presbitero", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read"]);
    const gId = await seedGravacao(t);

    await expect(
      as(t, userId).query(api.gravacoes.queries.getById, { id: gId })
    ).rejects.toThrow(/Sem permissao/);
    expect(await as(t, userId).query(api.gravacoes.queries.list, {})).toEqual([]);
  });
});

// Preparo comum dos pontos 2 a 10: obreiro sem snapshot, linha do obreiro só
// com membros:read e linha do membro com uma única permissão que o obreiro
// não tem. Cada caso falha se o embrulho daquele ponto faltar.
async function prepararObreiro(t: T, permissaoDoMembro: string) {
  const { userId, membroId } = await seedUserComMembro(t, { role: "obreiro" });
  await seedRolePerms(t, "obreiro", ["membros:read"]);
  await seedRolePerms(t, "membro", [permissaoDoMembro]);
  return { ctx: as(t, userId), membroId };
}

async function seedOutroMembro(t: T, role = "membro") {
  const { membroId } = await seedUserComMembro(t, { role });
  return membroId;
}

describe("obreiro herda o papel membro — demais pontos de checagem", () => {
  it("P2: pedidosOracao/queries (isLeaderMembro) mostra pedido do escopo leaders", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "pastoreio:update");
    const autor = await seedOutroMembro(t);
    const pedidoId = await t.run(async (ctx) =>
      ctx.db.insert("pedidosOracao", {
        membroId: autor,
        descricao: "Pedido para lideranca",
        status: "ATIVO",
        scope: "leaders",
        qtdOrando: 0,
        criadoEm: 1,
      })
    );

    const lista = await ctx.query(api.pedidosOracao.queries.listMuralRequests, {});
    expect(lista.map((p: { _id: string }) => p._id)).toContain(pedidoId);
  });

  it("P3: pedidosOracao/mutations (updateStatus) permite a lideranca herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "pastoreio:update");
    const autor = await seedOutroMembro(t);
    const pedidoId = await t.run(async (ctx) =>
      ctx.db.insert("pedidosOracao", {
        membroId: autor,
        descricao: "Pedido de outro autor",
        status: "ATIVO",
        qtdOrando: 0,
        criadoEm: 1,
      })
    );

    await ctx.mutation(api.pedidosOracao.mutations.updateStatus, {
      id: pedidoId,
      status: "RESPONDIDO",
    });
    const depois = await t.run(async (ctx) => ctx.db.get(pedidoId));
    expect(depois?.status).toBe("RESPONDIDO");
  });

  it("P4: gravacoes/ai (startProcessing) passa do gate de permissão", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "gravacoes:process_ai");
    const gId = await t.run(async (ctx) =>
      ctx.db.insert("gravacoes", {
        titulo: "Sermao IA",
        tipo: "SERMAO",
        data: "2026-06-01",
        status: "PUBLICADO",
        iaStatus: "TRANSCREVENDO",
      } as any)
    );

    // Passa do gate e cai na checagem seguinte; sem a herança a mensagem
    // seria "Sem permissao para processar com IA".
    await expect(
      ctx.mutation(api.gravacoes.ai.startProcessing, { id: gId })
    ).rejects.toThrow(/Processamento ja em andamento/);
  });

  it("P5: pastoreio/queries lista visitas com pastoreio:read herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx, membroId } = await prepararObreiro(t, "pastoreio:read");
    const visitaId = await t.run(async (ctx) =>
      ctx.db.insert("visitasPastorais", {
        membroId,
        visitanteId: membroId,
        data: "2026-06-01",
        tipo: "DOMICILIAR",
        criadoEm: 1,
      })
    );

    const lista = await ctx.query(api.pastoreio.queries.listVisitas, {});
    expect(lista.map((v: { _id: string }) => v._id)).toContain(visitaId);
  });

  it("P6: pastoreio/mutations cria pedido com pedidos_oracao:create herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "pedidos_oracao:create");

    const id = await ctx.mutation(api.pastoreio.mutations.createPedidoOracao, {
      descricao: "Pedido do obreiro",
    });
    expect(id).toBeTruthy();
  });

  it("P7: educacional/queries lista membros com criancas:manage herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "criancas:manage");

    const lista = await ctx.query(api.educacional.queries.listMembrosParaOvelhinha, {});
    expect(lista.length).toBeGreaterThan(0);
  });

  it("P8: tarefas/queries lista todas com tarefas:read herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "tarefas:read");
    const outro = await seedOutroMembro(t);
    const tarefaId = await t.run(async (ctx) =>
      ctx.db.insert("tarefas", {
        titulo: "Tarefa de outro",
        status: "ABERTA",
        prioridade: "MEDIA",
        criadoPor: outro,
        responsavelId: outro,
        criadoEm: 1,
      })
    );

    const lista = await ctx.query(api.tarefas.queries.list, { filtro: "TODAS" });
    expect(lista.map((x: { _id: string }) => x._id)).toContain(tarefaId);
  });

  it("P9: tarefas/mutations cria tarefa com tarefas:create herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx, membroId } = await prepararObreiro(t, "tarefas:create");

    const id = await ctx.mutation(api.tarefas.mutations.create, {
      titulo: "Nova tarefa",
      prioridade: "MEDIA",
      responsavelId: membroId as Id<"membros">,
    });
    expect(id).toBeTruthy();
  });

  it("P10: audit/queries lista logs com audit:read herdada", async () => {
    const t = convexTest(schema, modules);
    const { ctx } = await prepararObreiro(t, "audit:read");
    const logId = await t.run(async (ctx) =>
      ctx.db.insert("auditLogs", {
        action: "CREATE",
        referenciaTabela: "tarefas",
        referenciaId: "x",
        createdAt: 1,
      })
    );

    const lista = await ctx.query(api.audit.queries.list, {});
    expect(lista.map((l: { _id: string }) => l._id)).toContain(logId);
  });
});
