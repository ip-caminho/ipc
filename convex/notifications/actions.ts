"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import webpush from "web-push";

type PushSub = { endpoint: string; p256dh: string; auth: string };

function setupVapid() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("VAPID keys não configuradas");
  }

  webpush.setVapidDetails(
    "mailto:contato@ipcaminho.com.br",
    vapidPublicKey,
    vapidPrivateKey
  );
}

// Entrega o payload para uma lista de subscriptions, removendo as invalidas.
async function deliverPush(ctx: any, subscriptions: PushSub[], payload: string) {
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (error: any) {
      failed++;
      // Remove invalid subscriptions (410 Gone or 404)
      if (error.statusCode === 410 || error.statusCode === 404) {
        await ctx.runMutation(
          // @ts-ignore referencia de funcao por string
          "notifications/mutations:removePushSubscription",
          { endpoint: sub.endpoint }
        );
      }
    }
  }

  return { sent, failed, total: subscriptions.length };
}

export const sendPushToAll = action({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { title, body, url }) => {
    // SEGURANCA: só admin pode disparar push para todos ("*" = admin).
    const isAdmin = await ctx.runQuery(
      // @ts-ignore referencia de funcao por string
      "_shared/requirePermission:currentUserHasPermission",
      { permission: "*" }
    );
    if (!isAdmin) throw new Error("Sem permissao");

    setupVapid();

    const subscriptions = await ctx.runQuery(
      // @ts-ignore referencia de funcao por string
      "notifications/queries:listAllSubscriptions",
      {}
    );

    const payload = JSON.stringify({ title, body, url: url || "/dashboard" });
    return await deliverPush(ctx, subscriptions, payload);
  },
});

// Push segmentado por papel — usado para avisar a lideranca (ex: ausencias).
export const sendPushToRoles = internalAction({
  args: {
    roles: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { roles, title, body, url }) => {
    setupVapid();

    const subscriptions = await ctx.runQuery(
      // @ts-ignore referencia de funcao por string
      "notifications/queries:listSubscriptionsForRoles",
      { roles }
    );

    const payload = JSON.stringify({ title, body, url: url || "/ausencias" });
    return await deliverPush(ctx, subscriptions, payload);
  },
});
