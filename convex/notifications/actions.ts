"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import webpush from "web-push";

export const sendPushToAll = action({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { title, body, url }) => {
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

    // Get all subscriptions
    const subscriptions = await ctx.runQuery(
      // @ts-ignore
      "notifications/queries:listAllSubscriptions",
      {}
    );

    const payload = JSON.stringify({ title, body, url: url || "/dashboard" });

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
            // @ts-ignore
            "notifications/mutations:removePushSubscription",
            { endpoint: sub.endpoint }
          );
        }
      }
    }

    return { sent, failed, total: subscriptions.length };
  },
});
