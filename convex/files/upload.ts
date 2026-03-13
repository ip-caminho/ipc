"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { generateObjectKey, generatePresignedUploadUrl, deleteFromB2 } from "./helpers";
import { generatePresignedReadUrl } from "./signing";

export const getUploadUrl = action({
  args: {
    folder: v.string(),
    entityId: v.string(),
    mimeType: v.string(),
    fileName: v.string(),
  },
  handler: async (_ctx, args) => {
    const ext = args.fileName.split(".").pop() || "bin";
    const key = generateObjectKey(args.folder, args.entityId, ext);
    const result = await generatePresignedUploadUrl(key, args.mimeType);
    console.log("[getUploadUrl] key:", key, "uploadUrl:", result.uploadUrl.substring(0, 100) + "...");
    return result;
  },
});

export const getReadUrl = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    return await generatePresignedReadUrl(args.url);
  },
});

export const deleteFile = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    return await deleteFromB2(args.url);
  },
});
