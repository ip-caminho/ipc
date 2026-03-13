import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const logLogin = mutation({
  args: { method: v.string() },
  handler: async (ctx, { method }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    await ctx.db.insert("auditLogs", {
      action: "LOGIN",
      referenciaTabela: "auth",
      referenciaId: userId,
      userId,
      membroId: membro?._id,
      field: "method",
      from: undefined,
      to: method,
      createdAt: Date.now(),
    });
  },
});
