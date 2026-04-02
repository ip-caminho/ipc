import { query } from "../_generated/server";

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
