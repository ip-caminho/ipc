import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createActionAuditLog } from "../_shared/auditHelpers";

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();

  if (!membro || membro.role !== "admin") {
    throw new Error("Apenas admin pode alterar a configuracao do app");
  }

  return { userId, membro };
}

export const setModoQuiosque = mutation({
  args: { ativo: v.boolean() },
  handler: async (ctx, { ativo }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db.query("configApp").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        modoQuiosque: ativo,
        atualizadoEm: Date.now(),
      });
      await createActionAuditLog(ctx, "UPDATE", "configApp", existing._id as string);
      return existing._id;
    }
    const id = await ctx.db.insert("configApp", {
      modoQuiosque: ativo,
      atualizadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "configApp", id as string);
    return id;
  },
});
