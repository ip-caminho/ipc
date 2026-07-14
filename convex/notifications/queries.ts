import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { checkPermission } from "../_shared/requirePermission";

// INTERNAL: expõe endpoint + chaves de push de todos os membros. Só pode ser
// lida de dentro do backend (usada pela action sendPushToAll).
export const listAllSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pushSubscriptions").collect();
  },
});

export const countSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    // Só admin ("*"). Degrada para null em vez de lançar: a pagina /admin/modulos
    // roda este useQuery antes do AdminGate; lançar quebraria a tela.
    if (!(await checkPermission(ctx, "*"))) return null;
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
