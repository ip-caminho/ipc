import { internalMutation } from "../_generated/server";

const OLD_PERMISSION = "membros:update_eclesiastico";
const NEW_PERMISSIONS = ["rol:read", "rol:update"];

/**
 * Migra a permissao legada `membros:update_eclesiastico` para as granulares
 * `rol:read` + `rol:update`, em rolePermissions (papeis editados no banco) e
 * em membros.permissions (overrides individuais).
 *
 * Idempotente: rodadas subsequentes nao encontram a permissao antiga.
 * Rodar: npx convex run preferencias/migrations:migrateRolPermissions
 * (em dev e em prod, junto do deploy desta feature)
 */
export const migrateRolPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const swap = (permissions: string[]): string[] =>
      Array.from(
        new Set([
          ...permissions.filter((p) => p !== OLD_PERMISSION),
          ...NEW_PERMISSIONS,
        ]),
      );

    let rolesAtualizados = 0;
    const roles = await ctx.db.query("rolePermissions").collect();
    for (const r of roles) {
      if (r.permissions.includes(OLD_PERMISSION)) {
        await ctx.db.patch(r._id, { permissions: swap(r.permissions) });
        rolesAtualizados++;
      }
    }

    let membrosAtualizados = 0;
    const membros = await ctx.db.query("membros").collect();
    for (const m of membros) {
      if (m.permissions?.includes(OLD_PERMISSION)) {
        await ctx.db.patch(m._id, { permissions: swap(m.permissions) });
        membrosAtualizados++;
      }
    }

    return { rolesAtualizados, membrosAtualizados };
  },
});
