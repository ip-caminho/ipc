import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { Id } from "../../_generated/dataModel";
import { INITIAL_ROLE_PERMISSIONS } from "../rbacHelpers";

const ROLE_DEFAULTS_MEMBRO = INITIAL_ROLE_PERMISSIONS.membro;

async function seedMembroWithRole(
  t: ReturnType<typeof convexTest>,
  opts: { role: string; permissions?: string[]; nomeCompleto?: string; foto?: string; whatsapp?: string }
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto: opts.nomeCompleto ?? `Membro ${opts.role}`,
      foto: opts.foto,
      whatsapp: opts.whatsapp,
    });
    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: opts.role,
      userId,
      permissions: opts.permissions,
    });
    return { membroId, entidadeId, userId };
  });
}

describe("RBAC — getUserPermissionContext", () => {
  it("retorna null sem autenticação", async () => {
    const t = convexTest(schema, modules);
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    const result = await t.query(api.preferencias.rbac.getUserPermissionContext, {});
    expect(result).toBeNull();
  });

  it("retorna null quando membro não existe", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});
    expect(result).toBeNull();
  });

  it("retorna null quando entidade está inativa", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {});
      const eid = await ctx.db.insert("entidades", {
        tipoEntidade: "PF",
        papeis: [],
        status: "INATIVO",
        nomeCompleto: "Membro Inativo",
      });
      await ctx.db.insert("membros", { entidadeId: eid, role: "membro", userId: uid });
      return uid;
    });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});
    expect(result).toBeNull();
  });

  it("retorna permissões padrão do role quando sem customização", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "membro" });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});

    expect(result).not.toBeNull();
    expect(result!.role).toBe("membro");
    // Membro: self_service, gravacoes:read (ouvir) e pedidos de oracao
    expect(result!.permissions).toContain("membros:self_service");
    expect(result!.permissions).toContain("gravacoes:read");
    expect(result!.permissions).toContain("pedidos_oracao:read");
    expect(result!.permissions).not.toContain("diretorio:read");
    expect(result!.permissions).not.toContain("membros:delete");
  });

  it("retorna permissões customizadas do membro quando existem", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, {
      role: "membro",
      permissions: ["membros:self_service", "diretorio:read", "gravacoes:read", "gravacoes:create"],
    });
    // Linha do membro dentro do snapshot: a herança não acrescenta nada.
    await t.run(async (ctx) => {
      await ctx.db.insert("rolePermissions", {
        role: "membro",
        permissions: ["membros:self_service", "gravacoes:read"],
        updatedAt: Date.now(),
      });
    });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});

    expect(result!.permissions).toContain("gravacoes:create");
    expect(result!.permissions).toHaveLength(4);
  });

  it("retorna permissões do DB quando rolePermissions existe", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "secretaria" });

    await t.run(async (ctx) => {
      await ctx.db.insert("rolePermissions", {
        role: "secretaria",
        permissions: ["membros:read", "diretorio:read"],
        updatedAt: Date.now(),
      });
      await ctx.db.insert("rolePermissions", {
        role: "membro",
        permissions: ["gravacoes:read"],
        updatedAt: Date.now(),
      });
    });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});

    expect([...result!.permissions].sort()).toEqual(
      ["diretorio:read", "gravacoes:read", "membros:read"].sort()
    );
  });

  it("retorna wildcard * para admin", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "admin" });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});

    expect(result!.role).toBe("admin");
    expect(result!.permissions).toEqual(["*"]);
  });

  it("inclui dados do perfil (nome, foto, phone)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, {
      role: "membro",
      nomeCompleto: "Ana Maria",
      foto: "https://example.com/foto.jpg",
      whatsapp: "+5511999999999",
    });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});

    expect(result!.name).toBe("Ana Maria");
    expect(result!.foto).toBe("https://example.com/foto.jpg");
    expect(result!.phone).toBe("+5511999999999");
  });
});

describe("RBAC — seedRolePermissions", () => {
  it("cria registros iniciais se não existem", async () => {
    const t = convexTest(schema, modules);

    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await t.mutation(internal.preferencias.rbac.seedRolePermissions, {});

    const roles = await t.run(async (ctx) => ctx.db.query("rolePermissions").collect());

    expect(roles.length).toBeGreaterThanOrEqual(3);
    const admin = roles.find((r) => r.role === "admin");
    const secretaria = roles.find((r) => r.role === "secretaria");
    const membro = roles.find((r) => r.role === "membro");

    expect(admin?.permissions).toEqual(["*"]);
    expect(secretaria?.permissions).toContain("membros:read");
    expect(membro?.permissions).toContain("membros:self_service");
  });

  it("não duplica registros em execuções múltiplas", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.preferencias.rbac.seedRolePermissions, {});
    await t.mutation(internal.preferencias.rbac.seedRolePermissions, {});

    const roles = await t.run(async (ctx) => ctx.db.query("rolePermissions").collect());
    const adminRoles = roles.filter((r) => r.role === "admin");
    expect(adminRoles).toHaveLength(1);
  });
});

async function seedRolePerms(
  t: ReturnType<typeof convexTest>,
  role: string,
  permissions: string[]
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("rolePermissions", { role, permissions, updatedAt: Date.now() });
  });
}

describe("RBAC — todo papel herda as permissões do papel membro", () => {
  const ctxPerms = async (t: ReturnType<typeof convexTest>, userId: Id<"users">) => {
    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});
    return result!.permissions;
  };

  it("C1: obreiro sem nenhuma linha no banco tem gravacoes:read e tarefas:read (constante)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "obreiro" });
    const perms = await ctxPerms(t, userId);
    expect(perms).toContain("gravacoes:read");
    expect(perms).toContain("tarefas:read");
  });

  it("C2: une a linha do obreiro com a linha do membro", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "obreiro" });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read", "biblioteca:read"]);
    const perms = await ctxPerms(t, userId);
    expect([...perms].sort()).toEqual(
      ["biblioteca:read", "gravacoes:read", "membros:read"].sort()
    );
  });

  it("C3: sem linha do membro, herda a constante do membro", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "obreiro" });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    const perms = await ctxPerms(t, userId);
    expect(perms).toContain("membros:read");
    for (const p of ROLE_DEFAULTS_MEMBRO) expect(perms).toContain(p);
  });

  it("C4: snapshot do obreiro continua valendo e a herança é somada", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, {
      role: "obreiro",
      permissions: ["tarefas:read"],
    });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read"]);
    const perms = await ctxPerms(t, userId);
    expect(perms).toContain("tarefas:read");
    expect(perms).toContain("gravacoes:read");
    expect(perms).not.toContain("membros:read");
  });

  it("C5: mudança no papel membro chega ao obreiro", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, { role: "obreiro" });
    const admin = await seedMembroWithRole(t, { role: "admin" });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read"]);
    expect(await ctxPerms(t, userId)).not.toContain("biblioteca:read");

    await t
      .withIdentity({ subject: `${admin.userId}|session-1` })
      .mutation(api.preferencias.rbac.updateRolePermissions, {
        role: "membro",
        permissions: ["gravacoes:read", "biblioteca:read"],
      });
    expect(await ctxPerms(t, userId)).toContain("biblioteca:read");
  });

  it("C6: presbitero e secretario_executivo herdam do membro", async () => {
    const t = convexTest(schema, modules);
    const pres = await seedMembroWithRole(t, { role: "presbitero" });
    const sec = await seedMembroWithRole(t, { role: "secretario_executivo" });
    await seedRolePerms(t, "presbitero", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read", "pedidos_oracao:create"]);
    expect([...(await ctxPerms(t, pres.userId))].sort()).toEqual(
      ["gravacoes:read", "membros:read", "pedidos_oracao:create"].sort()
    );
    // Sem linha própria: a base do secretario_executivo é a constante dele.
    const secPerms = await ctxPerms(t, sec.userId);
    expect(secPerms).toContain("gravacoes:read");
    expect(secPerms).toContain("pedidos_oracao:create");
    expect(secPerms).toContain("rol:read");
  });

  it("C7: getAllMembrosWithPermissions aplica a herança a todo papel e a membro com snapshot", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedMembroWithRole(t, { role: "admin" });
    const obreiro = await seedMembroWithRole(t, { role: "obreiro" });
    const pres = await seedMembroWithRole(t, { role: "presbitero" });
    const comSnapshot = await seedMembroWithRole(t, {
      role: "membro",
      permissions: ["membros:self_service"],
    });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "presbitero", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read", "biblioteca:read"]);

    const list = await t
      .withIdentity({ subject: `${admin.userId}|session-1` })
      .query(api.preferencias.rbac.getAllMembrosWithPermissions, {});
    const o = list.find((m) => m._id === obreiro.membroId)!;
    const p = list.find((m) => m._id === pres.membroId)!;
    const c = list.find((m) => m._id === comSnapshot.membroId)!;
    expect([...o.permissions].sort()).toEqual(
      ["biblioteca:read", "gravacoes:read", "membros:read"].sort()
    );
    expect(o.hasCustomPermissions).toBe(false);
    expect([...p.permissions].sort()).toEqual(
      ["biblioteca:read", "gravacoes:read", "membros:read"].sort()
    );
    expect(p.hasCustomPermissions).toBe(false);
    expect([...c.permissions].sort()).toEqual(
      ["biblioteca:read", "gravacoes:read", "membros:self_service"].sort()
    );
    expect(c.hasCustomPermissions).toBe(true);
  });

  it("C8: setMembroPermission recusa remover permissão herdada de obreiro", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedMembroWithRole(t, { role: "admin" });
    const obreiro = await seedMembroWithRole(t, { role: "obreiro" });
    await seedRolePerms(t, "obreiro", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read"]);
    const asAdmin = t.withIdentity({ subject: `${admin.userId}|session-1` });

    await expect(
      asAdmin.mutation(api.preferencias.rbac.setMembroPermission, {
        membroId: obreiro.membroId,
        permission: "gravacoes:read",
        hasPermission: false,
      })
    ).rejects.toThrow(/herdada/i);
    const depois = await t.run(async (ctx) => ctx.db.get(obreiro.membroId));
    expect(depois!.permissions ?? []).toEqual([]);

    // Linha do obreiro com duas permissões próprias: remover uma delas (não
    // herdada) grava o snapshot com a outra, e a herança segue somada.
    await t.run(async (ctx) => {
      const linha = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", "obreiro"))
        .first();
      await ctx.db.patch(linha!._id, { permissions: ["membros:read", "tarefas:read"] });
    });
    await asAdmin.mutation(api.preferencias.rbac.setMembroPermission, {
      membroId: obreiro.membroId,
      permission: "membros:read",
      hasPermission: false,
    });
    const gravado = await t.run(async (ctx) => ctx.db.get(obreiro.membroId));
    expect(gravado!.permissions).toEqual(["tarefas:read"]);
    const perms = await ctxPerms(t, obreiro.userId);
    expect([...perms].sort()).toEqual(["gravacoes:read", "tarefas:read"]);
  });

  it("C9: applyVolunteerSet(apply:false) não remove permissão herdada do obreiro sem snapshot", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedMembroWithRole(t, { role: "admin" });
    const obreiro = await seedMembroWithRole(t, { role: "obreiro" });
    await seedRolePerms(t, "obreiro", ["membros:read", "biblioteca:read"]);
    await seedRolePerms(t, "membro", ["biblioteca:read"]);

    await t
      .withIdentity({ subject: `${admin.userId}|session-1` })
      .mutation(api.preferencias.rbac.applyVolunteerSet, {
        membroId: obreiro.membroId,
        setKey: "voluntario_biblioteca",
        apply: false,
      });
    const gravado = await t.run(async (ctx) => ctx.db.get(obreiro.membroId));
    // A permissão herdada do conjunto não sai do snapshot.
    expect(gravado!.permissions).toEqual(["membros:read", "biblioteca:read"]);
    expect(await ctxPerms(t, obreiro.userId)).toContain("biblioteca:read");
  });

  it("C10: secretaria com snapshot recebe a linha do membro", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, {
      role: "secretaria",
      permissions: ["membros:read"],
    });
    await seedRolePerms(t, "membro", ["pedidos_oracao:create"]);
    expect([...(await ctxPerms(t, userId))].sort()).toEqual(
      ["membros:read", "pedidos_oracao:create"].sort()
    );
  });

  it("C11: membro com snapshot sem louvor:read passa a ter (caso de produção)", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedMembroWithRole(t, {
      role: "membro",
      permissions: ["membros:self_service", "gravacoes:read"],
    });
    await seedRolePerms(t, "membro", ["membros:self_service", "gravacoes:read", "louvor:read"]);
    expect([...(await ctxPerms(t, userId))].sort()).toEqual(
      ["gravacoes:read", "louvor:read", "membros:self_service"].sort()
    );
  });

  it("C12: setMembroPermission recusa remover herdada de qualquer pessoa", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedMembroWithRole(t, { role: "admin" });
    const pres = await seedMembroWithRole(t, { role: "presbitero" });
    const membroSem = await seedMembroWithRole(t, { role: "membro" });
    const membroCom = await seedMembroWithRole(t, {
      role: "membro",
      permissions: ["gravacoes:read", "louvor:create"],
    });
    await seedRolePerms(t, "presbitero", ["membros:read"]);
    await seedRolePerms(t, "membro", ["gravacoes:read", "calendario:read"]);
    const asAdmin = t.withIdentity({ subject: `${admin.userId}|session-1` });

    for (const alvo of [pres, membroSem]) {
      await expect(
        asAdmin.mutation(api.preferencias.rbac.setMembroPermission, {
          membroId: alvo.membroId,
          permission: "gravacoes:read",
          hasPermission: false,
        })
      ).rejects.toThrow(/herdada/i);
      const depois = await t.run(async (ctx) => ctx.db.get(alvo.membroId));
      expect(depois!.permissions ?? []).toEqual([]);
    }

    await asAdmin.mutation(api.preferencias.rbac.setMembroPermission, {
      membroId: membroCom.membroId,
      permission: "louvor:create",
      hasPermission: false,
    });
    const gravado = await t.run(async (ctx) => ctx.db.get(membroCom.membroId));
    expect(gravado!.permissions).toEqual(["gravacoes:read"]);
  });

  it("C13: applyVolunteerSet(apply:false) não remove herdada de secretario_executivo nem de membro com snapshot", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedMembroWithRole(t, { role: "admin" });
    const sec = await seedMembroWithRole(t, {
      role: "secretario_executivo",
      permissions: ["membros:read", "biblioteca:read"],
    });
    const membro = await seedMembroWithRole(t, {
      role: "membro",
      permissions: ["membros:self_service", "biblioteca:read", "biblioteca:create"],
    });
    await seedRolePerms(t, "secretario_executivo", ["membros:read", "biblioteca:read"]);
    await seedRolePerms(t, "membro", ["membros:self_service", "biblioteca:read"]);
    const asAdmin = t.withIdentity({ subject: `${admin.userId}|session-1` });

    for (const alvo of [sec, membro]) {
      await asAdmin.mutation(api.preferencias.rbac.applyVolunteerSet, {
        membroId: alvo.membroId,
        setKey: "voluntario_biblioteca",
        apply: false,
      });
    }
    const gSec = await t.run(async (ctx) => ctx.db.get(sec.membroId));
    const gMembro = await t.run(async (ctx) => ctx.db.get(membro.membroId));
    expect(gSec!.permissions).toEqual(["membros:read", "biblioteca:read"]);
    expect(gMembro!.permissions).toEqual(["membros:self_service", "biblioteca:read"]);
  });
});
