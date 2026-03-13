import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs } from "../_shared/auditHelpers";
import { filterSelfServiceFields } from "./selfServiceHelpers";

export const getMyProfile = query({
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
    return { ...membro, entidade };
  },
});

export const updateMyProfile = mutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Member not found");

    // Ownership check: only update own profile
    if (membro.userId !== userId) {
      throw new Error("Unauthorized: can only update own profile");
    }

    // Filter to only allowed fields
    const filteredData = filterSelfServiceFields(data);
    if (!filteredData) {
      throw new Error("No valid fields to update");
    }

    const oldEntidade = await ctx.db.get(membro.entidadeId);
    await ctx.db.patch(membro.entidadeId, filteredData);
    const newEntidade = await ctx.db.get(membro.entidadeId);

    await createFieldAuditLogs(ctx, oldEntidade, newEntidade, "entidades", membro.entidadeId);
    return membro._id;
  },
});
