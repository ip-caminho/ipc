"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateObjectKey, generatePresignedUploadUrl, deleteFromB2 } from "./helpers";
import { generatePresignedReadUrl } from "./signing";

export const getUploadUrl = action({
  args: {
    folder: v.string(),
    entityId: v.string(),
    mimeType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // Login + permissao compativel com a pasta (ver files/authz.ts)
    await ctx.runQuery(internal.files.authz.checkUploadAccess, { folder: args.folder });
    const ext = args.fileName.split(".").pop() || "bin";
    const key = generateObjectKey(args.folder, args.entityId, ext);
    const result = await generatePresignedUploadUrl(key, args.mimeType);
    console.log("[getUploadUrl] key:", key, "uploadUrl:", result.uploadUrl.substring(0, 100) + "...");
    return result;
  },
});

export const getReadUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await generatePresignedReadUrl(args.url);
  },
});

// Somente backend (scheduler em gravacoes/mutations) — nao expor ao cliente
export const deleteFile = internalAction({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    return await deleteFromB2(args.url);
  },
});
