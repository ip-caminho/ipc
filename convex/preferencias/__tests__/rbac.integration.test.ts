import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { Id } from "../../_generated/dataModel";

async function seedMembroWithRole(
  t: ReturnType<typeof convexTest>,
  opts: { role: string; permissions?: string[]; nomeCompleto?: string; foto?: string; whatsapp?: string }
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["MEMBRO"],
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
        papeis: ["MEMBRO"],
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
    });

    const asUser = t.withIdentity({ subject: `${userId}|session-1` });
    const result = await asUser.query(api.preferencias.rbac.getUserPermissionContext, {});

    expect(result!.permissions).toEqual(["membros:read", "diretorio:read"]);
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

    await t.mutation(api.preferencias.rbac.seedRolePermissions, {});

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

    await t.mutation(api.preferencias.rbac.seedRolePermissions, {});
    await t.mutation(api.preferencias.rbac.seedRolePermissions, {});

    const roles = await t.run(async (ctx) => ctx.db.query("rolePermissions").collect());
    const adminRoles = roles.filter((r) => r.role === "admin");
    expect(adminRoles).toHaveLength(1);
  });
});
