import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
  // Auditoria
  "audit:read",
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
    "audit:read": "Ver Auditoria",
  };
  return labels[perm] ?? perm;
}

function getPermissionModule(perm: string): string {
  if (perm.startsWith("membros:")) return "Membros";
  if (perm.startsWith("entidades:")) return "Entidades";
  if (perm.startsWith("diretorio:")) return "Diretorio";
  if (perm.startsWith("gravacoes:")) return "Gravacoes";
  if (perm.startsWith("audit:")) return "Auditoria";
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
    "audit:read": "Ver logs de auditoria do sistema",
  };
  return descriptions[perm] ?? "";
}

// Initial role-permission mapping (Phase 1: 3 roles)
const INITIAL_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  secretaria: [
    "membros:read", "membros:create", "membros:update",
    "entidades:read", "entidades:create", "entidades:update", "entidades:delete",
    "diretorio:read",
    "gravacoes:read", "gravacoes:create", "gravacoes:update", "gravacoes:delete", "gravacoes:process_ai",
    "audit:read",
  ],
  membro: [
    "membros:self_service",
    "diretorio:read",
    "gravacoes:read",
  ],
};

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
    let permissions: string[];
    if (membro.permissions && membro.permissions.length > 0) {
      permissions = membro.permissions;
    } else {
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", membro.role))
        .first();
      permissions = rolePerms?.permissions ?? INITIAL_ROLE_PERMISSIONS[membro.role] ?? [];
    }

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
        permissions: rolePerms?.permissions ?? INITIAL_ROLE_PERMISSIONS[role] ?? [],
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
      let permissions: string[];
      if (m.permissions && m.permissions.length > 0) {
        permissions = m.permissions;
      } else {
        const rolePerms = await ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("role", m.role))
          .first();
        permissions = rolePerms?.permissions ?? INITIAL_ROLE_PERMISSIONS[m.role] ?? [];
      }

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
    for (const [role, permissions] of Object.entries(INITIAL_ROLE_PERMISSIONS)) {
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
      currentPerms = [...(rolePerms?.permissions ?? INITIAL_ROLE_PERMISSIONS[membro.role] ?? [])];
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
