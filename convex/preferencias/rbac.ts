import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { INITIAL_ROLE_PERMISSIONS as ROLE_DEFAULTS, resolvePermissions } from "./rbacHelpers";

// ===== PERMISSION DEFINITIONS =====

export const ALL_PERMISSIONS = [
  // Membros
  "membros:read",
  "membros:create",
  "membros:update",
  "membros:delete",
  "membros:self_service",
  // Entidades
  "entidades:read",
  "entidades:create",
  "entidades:update",
  "entidades:delete",
  // Diretorio
  "diretorio:read",
  // Gravacoes
  "gravacoes:read",
  "gravacoes:create",
  "gravacoes:update",
  "gravacoes:delete",
  "gravacoes:process_ai",
  // Escalas (Liturgia)
  "escalas:read",
  "escalas:create",
  "escalas:update",
  "escalas:delete",
  // Auditoria
  "audit:read",
  // Pastoreio
  "pastoreio:read",
  "pastoreio:create",
  "pastoreio:update",
  "pastoreio:delete",
  // Pequenos Grupos
  "pequenos_grupos:read",
  "pequenos_grupos:create",
  "pequenos_grupos:update",
  "pequenos_grupos:delete",
  // Pedidos de Oracao (membro)
  "pedidos_oracao:create",
  "pedidos_oracao:read",
  // Ministerios
  "ministerios:read",
  "ministerios:create",
  "ministerios:update",
  "ministerios:delete",
  // Calendario
  "calendario:read",
  "calendario:create",
  "calendario:update",
  "calendario:delete",
  // Educacional Infantil
  "criancas:read",
  "criancas:manage",
  "educacional:read",
  "educacional:write",
] as const;

function getPermissionLabel(perm: string): string {
  const labels: Record<string, string> = {
    "membros:read": "Ver Membros",
    "membros:create": "Criar Membros",
    "membros:update": "Editar Membros",
    "membros:delete": "Excluir Membros",
    "membros:self_service": "Self-Service (editar proprio perfil)",
    "entidades:read": "Ver Entidades",
    "entidades:create": "Criar Entidades",
    "entidades:update": "Editar Entidades",
    "entidades:delete": "Excluir Entidades",
    "diretorio:read": "Ver Diretorio",
    "gravacoes:read": "Ver Gravacoes",
    "gravacoes:create": "Criar Gravacoes",
    "gravacoes:update": "Editar Gravacoes",
    "gravacoes:delete": "Excluir Gravacoes",
    "gravacoes:process_ai": "Processar com IA",
    "escalas:read": "Ver Escalas",
    "escalas:create": "Criar Escalas",
    "escalas:update": "Editar Escalas",
    "escalas:delete": "Excluir Escalas",
    "audit:read": "Ver Auditoria",
    "pastoreio:read": "Ver Pastoreio",
    "pastoreio:create": "Criar Pastoreio",
    "pastoreio:update": "Editar Pastoreio",
    "pastoreio:delete": "Excluir Pastoreio",
    "pequenos_grupos:read": "Ver Pequenos Grupos",
    "pequenos_grupos:create": "Criar Pequenos Grupos",
    "pequenos_grupos:update": "Editar Pequenos Grupos",
    "pequenos_grupos:delete": "Excluir Pequenos Grupos",
    "pedidos_oracao:create": "Criar Pedidos de Oracao",
    "pedidos_oracao:read": "Ver Pedidos de Oracao",
    "ministerios:read": "Ver Ministerios",
    "ministerios:create": "Criar Ministerios",
    "ministerios:update": "Editar Ministerios",
    "ministerios:delete": "Excluir Ministerios",
    "calendario:read": "Ver Calendario",
    "calendario:create": "Criar Eventos",
    "calendario:update": "Editar Eventos",
    "calendario:delete": "Excluir Eventos",
    "criancas:read": "Ver Criancas",
    "criancas:manage": "Gerenciar Criancas",
    "educacional:read": "Ver Educacional",
    "educacional:write": "Editar Educacional",
  };
  return labels[perm] ?? perm;
}

function getPermissionModule(perm: string): string {
  if (perm.startsWith("membros:")) return "Membros";
  if (perm.startsWith("entidades:")) return "Entidades";
  if (perm.startsWith("diretorio:")) return "Diretorio";
  if (perm.startsWith("gravacoes:")) return "Gravacoes";
  if (perm.startsWith("escalas:")) return "Escalas";
  if (perm.startsWith("audit:")) return "Auditoria";
  if (perm.startsWith("pastoreio:")) return "Pastoreio";
  if (perm.startsWith("pequenos_grupos:")) return "Pequenos Grupos";
  if (perm.startsWith("pedidos_oracao:")) return "Pedidos de Oracao";
  if (perm.startsWith("ministerios:")) return "Ministerios";
  if (perm.startsWith("calendario:")) return "Calendario";
  if (perm.startsWith("criancas:")) return "Educacional Infantil";
  if (perm.startsWith("educacional:")) return "Educacional Infantil";
  return "Geral";
}

function getPermissionDescription(perm: string): string {
  const descriptions: Record<string, string> = {
    "membros:read": "Ver lista e detalhes de membros",
    "membros:create": "Criar novos membros no sistema",
    "membros:update": "Editar dados de membros existentes",
    "membros:delete": "Excluir membros do sistema",
    "membros:self_service": "Membro pode editar seus proprios dados (telefone, email, etc)",
    "entidades:read": "Ver lista e detalhes de entidades (PF/PJ)",
    "entidades:create": "Criar novas entidades",
    "entidades:update": "Editar entidades existentes",
    "entidades:delete": "Excluir entidades",
    "diretorio:read": "Acessar o diretorio de membros da igreja",
    "gravacoes:read": "Ver gravacoes de sermoes e estudos",
    "gravacoes:create": "Cadastrar novas gravacoes",
    "gravacoes:update": "Editar gravacoes existentes",
    "gravacoes:delete": "Excluir gravacoes",
    "gravacoes:process_ai": "Processar gravacoes com inteligencia artificial (transcricao e analise)",
    "escalas:read": "Ver escala de liturgia e cultos",
    "escalas:create": "Criar cultos e escalas de liturgia",
    "escalas:update": "Editar escalas e atribuicoes de liturgia",
    "escalas:delete": "Excluir cultos e escalas",
    "audit:read": "Ver logs de auditoria do sistema",
    "pastoreio:read": "Ver visitas pastorais e anotacoes",
    "pastoreio:create": "Registrar visitas e anotacoes pastorais",
    "pastoreio:update": "Editar visitas e anotacoes pastorais",
    "pastoreio:delete": "Excluir visitas e anotacoes pastorais",
    "pequenos_grupos:read": "Ver pequenos grupos e seus membros",
    "pequenos_grupos:create": "Criar novos pequenos grupos",
    "pequenos_grupos:update": "Editar pequenos grupos existentes",
    "pequenos_grupos:delete": "Excluir pequenos grupos",
    "pedidos_oracao:create": "Criar pedidos de oracao",
    "pedidos_oracao:read": "Ver pedidos de oracao",
    "ministerios:read": "Ver ministerios e seus membros",
    "ministerios:create": "Criar novos ministerios",
    "ministerios:update": "Editar ministerios e gerenciar membros",
    "ministerios:delete": "Excluir ministerios",
    "calendario:read": "Ver eventos do calendario",
    "calendario:create": "Criar eventos no calendario",
    "calendario:update": "Editar eventos do calendario",
    "calendario:delete": "Excluir eventos do calendario",
    "criancas:read": "Ver nome e turma das criancas",
    "criancas:manage": "Gerenciar perfis completos (inclui obs medicas)",
    "educacional:read": "Ver relatorios e escalas do educacional",
    "educacional:write": "Criar/editar relatorios e escalas",
  };
  return descriptions[perm] ?? "";
}

// Visible roles in matrix (exclude admin — has wildcard *)
const VISIBLE_ROLES = ["secretaria", "membro"];

// ===== HELPER =====

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const callerMembro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();

  if (!callerMembro || callerMembro.role !== "admin") {
    throw new Error("Only admins can manage permissions");
  }
  return { userId, callerMembro };
}

// ===== QUERIES =====

export const getUserPermissionContext = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade || entidade.status !== "ATIVO") return null;

    // Use membro-level permissions if set, else fall back to role
    const rolePermsRecord = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("role", membro.role))
      .first();
    const permissions = resolvePermissions(
      membro.permissions,
      rolePermsRecord?.permissions,
      membro.role
    );

    return {
      membroId: membro._id,
      userId,
      role: membro.role,
      permissions,
      name: entidade.nomeCompleto ?? entidade.nomeRazaoSocial ?? "",
      foto: entidade.foto ?? null,
      phone: entidade.whatsapp ?? null,
      entidadeId: entidade._id,
    };
  },
});

export const getAllPermissionOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    return ALL_PERMISSIONS.map((key) => ({
      key,
      label: getPermissionLabel(key),
      module: getPermissionModule(key),
      description: getPermissionDescription(key),
    }));
  },
});

export const getAllRolesWithPermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    const results = [];
    for (const role of VISIBLE_ROLES) {
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      results.push({
        role,
        permissions: rolePerms?.permissions ?? ROLE_DEFAULTS[role] ?? [],
      });
    }
    return results;
  },
});

export const getAllMembrosWithPermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    const membros = await ctx.db.query("membros").collect();
    const results = [];
    for (const m of membros) {
      if (m.role === "admin") continue; // admin has wildcard, skip
      const entidade = await ctx.db.get(m.entidadeId);
      if (!entidade || entidade.status !== "ATIVO") continue;

      // Effective permissions: membro-level if set, else role-level
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", m.role))
        .first();
      const permissions = resolvePermissions(m.permissions, rolePerms?.permissions, m.role);

      results.push({
        _id: m._id,
        name: entidade.nomeCompleto ?? "",
        role: m.role,
        permissions,
        hasCustomPermissions: !!(m.permissions && m.permissions.length > 0),
      });
    }
    return results;
  },
});

export const listRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    const roles = await ctx.db.query("rolePermissions").collect();
    return roles.map((r) => ({
      _id: r._id,
      role: r.role,
      permissions: r.permissions,
      updatedAt: r.updatedAt,
    }));
  },
});

// ===== MUTATIONS =====

export const seedRolePermissions = mutation({
  args: {},
  handler: async (ctx) => {
    for (const [role, permissions] of Object.entries(ROLE_DEFAULTS) as [string, string[]][]) {
      const existing = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      if (!existing) {
        await ctx.db.insert("rolePermissions", {
          role,
          permissions,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const updateRolePermissions = mutation({
  args: {
    role: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { role, permissions }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("role", role))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { permissions, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("rolePermissions", { role, permissions, updatedAt: Date.now() });
    }
  },
});

export const setMembroPermission = mutation({
  args: {
    membroId: v.id("membros"),
    permission: v.string(),
    hasPermission: v.boolean(),
  },
  handler: async (ctx, { membroId, permission, hasPermission }) => {
    await requireAdmin(ctx);

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    if (membro.role === "admin") throw new Error("Nao e possivel editar permissoes de admin");

    // Get current effective permissions
    let currentPerms: string[];
    if (membro.permissions && membro.permissions.length > 0) {
      currentPerms = [...membro.permissions];
    } else {
      // Start from role defaults
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", membro.role))
        .first();
      currentPerms = [...(rolePerms?.permissions ?? ROLE_DEFAULTS[membro.role] ?? [])];
    }

    if (hasPermission && !currentPerms.includes(permission)) {
      currentPerms.push(permission);
    } else if (!hasPermission) {
      currentPerms = currentPerms.filter((p) => p !== permission);
    }

    await ctx.db.patch(membroId, { permissions: currentPerms });
  },
});

export const syncMembroWithRole = mutation({
  args: {
    membroId: v.id("membros"),
  },
  handler: async (ctx, { membroId }) => {
    await requireAdmin(ctx);

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");

    // Clear custom permissions — will fall back to role defaults
    await ctx.db.patch(membroId, { permissions: [] });
  },
});
