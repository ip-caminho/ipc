import { getAuthUserId } from "@convex-dev/auth/server";

async function loadAuthAndPerms(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) return null;

  if (membro.role === "admin") return { userId, membro, perms: ["*"] };

  const rolePerms = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("role", membro.role))
    .first();
  const perms: string[] = membro.permissions?.length > 0
    ? membro.permissions
    : (rolePerms?.permissions ?? []);

  return { userId, membro, perms };
}

function permsAllow(perms: string[], permission: string): boolean {
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  return false;
}

/**
 * Shared permission check for mutations.
 * Verifies authentication + role-based permission.
 * Returns userId and membro if authorized.
 */
export async function requirePermission(ctx: any, permission: string) {
  const ctxData = await loadAuthAndPerms(ctx);
  if (!ctxData) throw new Error("Not authenticated");
  const { userId, membro, perms } = ctxData;

  if (!permsAllow(perms, permission)) {
    throw new Error("Sem permissao");
  }

  return { userId, membro };
}

/**
 * Variante silenciosa de requirePermission: retorna null em vez de lançar.
 * Use em queries que devem degradar graciosamente (ex: widget de dashboard
 * que precisa retornar [] quando o usuário não tem a permissão).
 */
export async function checkPermission(ctx: any, permission: string) {
  const ctxData = await loadAuthAndPerms(ctx);
  if (!ctxData) return null;
  const { userId, membro, perms } = ctxData;

  if (!permsAllow(perms, permission)) return null;

  return { userId, membro };
}

/**
 * Como requirePermission, mas aceita qualquer uma de várias permissões.
 * Útil para queries compartilhadas entre fluxos (ex: "membros:read" OU
 * "diretorio:read").
 */
export async function requireAnyPermission(ctx: any, permissions: string[]) {
  const ctxData = await loadAuthAndPerms(ctx);
  if (!ctxData) throw new Error("Not authenticated");
  const { userId, membro, perms } = ctxData;

  if (!permissions.some((p) => permsAllow(perms, p))) {
    throw new Error("Sem permissao");
  }

  return { userId, membro };
}
