import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const whoAmI = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { status: "not_authenticated", userId: null };

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) return { status: "no_membro", userId };

    const entidade = await ctx.db.get(membro.entidadeId);
    return {
      status: "found",
      userId,
      membroId: membro._id,
      role: membro.role,
      entidadeStatus: entidade?.status ?? "not_found",
    };
  },
});

// Religa o user atual ao membro admin existente
export const relinkAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Encontra o membro admin
    const membros = await ctx.db.query("membros").collect();
    const admin = membros.find((m) => m.role === "admin");
    if (!admin) throw new Error("No admin membro found");

    // Atualiza o userId do admin pro user atual
    await ctx.db.patch(admin._id, { userId });
    return { ok: true, oldUserId: admin.userId, newUserId: userId };
  },
});
