import { convexTest } from "convex-test";

type T = ReturnType<typeof convexTest>;

/**
 * Cria user + entidade + membro vinculados. `permissions` sobrescreve as do
 * papel (loadAuthAndPerms usa membro.permissions quando preenchido), entao os
 * testes nao dependem da tabela rolePermissions estar semeada.
 */
export async function seedUser(
  t: T,
  opts: { role: string; permissions?: string[] }
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto: `Membro ${opts.role}`,
    });
    await ctx.db.insert("membros", {
      entidadeId,
      role: opts.role,
      userId,
      permissions: opts.permissions,
    });
    return userId;
  });
}

/** Usuario autenticado SEM membro — o estado de quem acabou de logar pelo OTP. */
export async function seedUserSemMembro(t: T) {
  return await t.run(async (ctx) => await ctx.db.insert("users", {}));
}

/** Executa as chamadas como o usuario informado. */
export const as = (t: T, userId: string) =>
  t.withIdentity({ subject: `${userId}|session-1` });
