import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const listAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pushSubscriptions").collect();
  },
});

export const countSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("pushSubscriptions").collect();
    return subs.length;
  },
});

// Subscriptions apenas dos membros cujos papeis estao na lista.
// Usada pelo push segmentado (ex: avisar a lideranca de uma ausencia).
export const listSubscriptionsForRoles = internalQuery({
  args: { roles: v.array(v.string()) },
  handler: async (ctx, { roles }) => {
    const roleSet = new Set(roles);
    const subs = await ctx.db.query("pushSubscriptions").collect();
    const result: { endpoint: string; p256dh: string; auth: string }[] = [];
    for (const sub of subs) {
      const membro = await ctx.db.get(sub.membroId);
      if (membro && roleSet.has(membro.role)) {
        result.push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
      }
    }
    return result;
  },
});
