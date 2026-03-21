import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Shared permission check for mutations.
 * Verifies authentication + role-based permission.
 * Returns userId and membro if authorized.
 */
export async function requirePermission(ctx: any, permission: string) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");

  if (membro.role === "admin") return { userId, membro };

  const rolePerms = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("role", membro.role))
    .first();
  const perms = membro.permissions?.length > 0
    ? membro.permissions
    : (rolePerms?.permissions ?? []);

  if (!perms.includes("*") && !perms.includes(permission)) {
    throw new Error("Sem permissao");
  }

  return { userId, membro };
}
